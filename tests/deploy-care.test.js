import { execFileSync, spawnSync } from "node:child_process";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createServer } from "node:http";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const deployScript = join(repositoryRoot, "scripts", "deploy-care.sh");
const remoteReleaseScript = join(
  repositoryRoot,
  "scripts",
  "remote-care-release.sh",
);
const publicVerifier = join(repositoryRoot, "scripts", "verify-care.mjs");

function createCleanRepository() {
  const root = mkdtempSync(join(tmpdir(), "this-moment-deploy-test-"));
  writeFileSync(join(root, "package.json"), '{"name":"deploy-test"}\n');
  writeFileSync(join(root, ".gitignore"), "dist/\n");
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Deploy Test"], { cwd: root });
  execFileSync("git", ["config", "user.email", "deploy-test@example.com"], {
    cwd: root,
  });
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["commit", "-qm", "fixture"], { cwd: root });
  return root;
}

function writeExecutable(path, contents) {
  writeFileSync(path, contents);
  chmodSync(path, 0o755);
}

function createRemoteReleaseFixture() {
  const deployRoot = mkdtempSync(join(tmpdir(), "this-moment-remote-test-"));
  const oldRelease = join(deployRoot, "releases", "old-release");
  const artifactRoot = mkdtempSync(join(tmpdir(), "this-moment-artifact-"));
  const transferRoot = mkdtempSync(join(tmpdir(), "this-moment-transfer-"));
  const tarball = join(transferRoot, "release.tar.gz");
  mkdirSync(oldRelease, { recursive: true });
  writeFileSync(join(oldRelease, "index.html"), "old release\n");
  symlinkSync("releases/old-release", join(deployRoot, "current"));
  writeFileSync(join(deployRoot, "compose.yml"), "services: {}\n");
  mkdirSync(join(artifactRoot, "assets"));
  writeFileSync(join(artifactRoot, "index.html"), "new release\n");
  writeFileSync(join(artifactRoot, "assets", "app.js"), "app\n");
  execFileSync("tar", ["-C", artifactRoot, "-czf", tarball, "."]);
  return { deployRoot, tarball };
}

function run(command, args, options) {
  return new Promise((resolveRun) => {
    const child = spawn(command, args, options);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      resolveRun({ status: 1, stderr: error.message, stdout });
    });
    child.on("close", (status) => {
      resolveRun({ status, stderr, stdout });
    });
  });
}

describe("deploy:care", () => {
  it("rejects a dirty worktree before running checks or uploading", () => {
    const root = createCleanRepository();
    const checkMarker = join(root, "check-ran");
    writeFileSync(join(root, "uncommitted.txt"), "dirty\n");

    const result = spawnSync("bash", [deployScript], {
      cwd: root,
      env: {
        ...process.env,
        CHECK_CMD: `touch ${checkMarker}`,
        DEPLOY_REPO_ROOT: root,
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Git worktree must be clean before deployment.");
    expect(existsSync(checkMarker)).toBe(false);
  });

  it("rolls back the activated release when public verification fails", () => {
    const root = createCleanRepository();
    const mockBin = mkdtempSync(join(tmpdir(), "this-moment-deploy-bin-"));
    const sshLog = join(mockBin, "ssh.log");
    writeExecutable(
      join(mockBin, "ssh"),
      '#!/usr/bin/env bash\nprintf "%s\\n" "$*" >> "${SSH_LOG}"\ncat >/dev/null\n',
    );
    writeExecutable(join(mockBin, "scp"), "#!/usr/bin/env bash\nexit 0\n");
    const publicCheckCount = join(mockBin, "public-check-count");
    writeExecutable(
      join(mockBin, "public-check"),
      '#!/usr/bin/env bash\ncount=0\n[[ ! -f "${PUBLIC_CHECK_COUNT}" ]] || count="$(cat "${PUBLIC_CHECK_COUNT}")"\ncount=$((count + 1))\nprintf "%s" "${count}" > "${PUBLIC_CHECK_COUNT}"\n[[ "${count}" -gt 1 ]]\n',
    );

    const result = spawnSync("bash", [deployScript], {
      cwd: root,
      env: {
        ...process.env,
        CHECK_CMD:
          "mkdir -p dist/assets && printf '<title>This Moment · 此刻</title><script src=\"/assets/app.js\"></script>' > dist/index.html && printf 'app' > dist/assets/app.js",
        DEPLOY_REPO_ROOT: root,
        PUBLIC_CHECK_CMD: join(mockBin, "public-check"),
        PUBLIC_CHECK_COUNT: publicCheckCount,
        SCP_BIN: join(mockBin, "scp"),
        SSH_BIN: join(mockBin, "ssh"),
        SSH_LOG: sshLog,
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Public verification failed; previous release restored.");
    expect(readFileSync(sshLog, "utf8")).toContain("rollback");
    expect(readFileSync(publicCheckCount, "utf8")).toBe("2");
  });

  it("restores the previous release when internal health verification fails", () => {
    const { deployRoot, tarball } = createRemoteReleaseFixture();

    const result = spawnSync(
      "bash",
      [remoteReleaseScript, "activate", deployRoot, "new-release", tarball],
      {
        env: {
          ...process.env,
          COMPOSE_CMD: "true",
          INTERNAL_CHECK_CMD: "false",
          ORIGIN_CHECK_CMD: "true",
          RESTORED_CHECK_CMD: "true",
        },
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(1);
    expect(readlinkSync(join(deployRoot, "current"))).toBe(
      "releases/old-release",
    );
    expect(result.stderr).toContain(
      "Internal health verification failed; previous release restored.",
    );
  });

  it("activates a healthy release and retains the previous release", () => {
    const { deployRoot, tarball } = createRemoteReleaseFixture();

    const result = spawnSync(
      "bash",
      [remoteReleaseScript, "activate", deployRoot, "new-release", tarball],
      {
        env: {
          ...process.env,
          COMPOSE_CMD: "true",
          INTERNAL_CHECK_CMD: "true",
          ORIGIN_CHECK_CMD: "true",
        },
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(0);
    expect(readlinkSync(join(deployRoot, "current"))).toBe(
      "releases/new-release",
    );
    expect(readlinkSync(join(deployRoot, "previous"))).toBe(
      "releases/old-release",
    );
    expect(existsSync(tarball)).toBe(false);
  });

  it("rejects an unrelated HTTP 200 page during public verification", async () => {
    const server = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "text/html" });
      response.end("<title>Welcome to nginx!</title>");
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    const publicUrl = `http://127.0.0.1:${address.port}`;

    const result = await run(process.execPath, [publicVerifier, publicUrl], {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.close();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Public page is not This Moment.");
  });

  it("verifies This Moment identity and a representative local asset", async () => {
    const server = createServer((request, response) => {
      if (request.url === "/assets/app.js") {
        response.writeHead(200, { "content-type": "text/javascript" });
        response.end("console.log('This Moment');");
        return;
      }
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        '<title>This Moment · 此刻</title><main id="app"></main><script src="/assets/app.js"></script>',
      );
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    const publicUrl = `http://127.0.0.1:${address.port}`;

    const result = await run(process.execPath, [publicVerifier, publicUrl], {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.close();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Verified");
    expect(result.stdout).toContain("/assets/app.js");
  });
});
