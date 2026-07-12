# This Moment domain context

## Purpose

This Moment is a responsive interaction prototype for people receiving end-of-life care. It helps users understand information, organize thoughts, and prepare communication while preserving user control.

## Boundaries

- The product explains, organizes, and guides.
- It does not diagnose, predict prognosis, recommend treatment, or replace clinicians or counselors.
- Sensitive health and emotional content remains in the current local session and is cleared by refresh or close.
- Generating and copying require preview and explicit confirmation; the prototype does not save or share content.
- Crisis signals interrupt the ordinary generation flow and direct the person to immediate human or emergency support.

## Shared language

- **Person**: the individual receiving end-of-life care whose information, choices, and confirmations the prototype represents.
  _Avoid_: user, patient, operator
- **Conversation audience**: a family member, friend, caregiver, or clinician with whom the person is preparing to communicate.
  _Avoid_: recipient, proxy user
- **Assisted interaction**: physical or accessibility help that enables the person to operate the prototype without transferring authority to enter, generate, confirm, or copy on the person's behalf.
  _Avoid_: proxy access, delegated confirmation
- **Core activity**: one of four independent, single-purpose interactions: "此刻的我", "帮我理解", "我想和某个人说", or "对我重要的事情". Only one core activity is active at a time.
  _Avoid_: dashboard, hub, workspace
- **Session content**: sensitive text held only in the current local page session and cleared by refresh or close.
  _Avoid_: saved content, history, record
- **Original information**: words entered by the person without AI interpretation.
- **Organized reflection**: a restatement of the person's original information under three headings: current feelings, current worries, and current hopes. It does not assess emotions or add diagnoses, predictions, or inferred facts.
  _Avoid_: emotional assessment, mood score, psychological profile
- **Plain-language explanation**: a simpler restatement that remains distinct from original information.
- **Uncertain information**: content that cannot be established from the person's input.
- **Confirmation question**: a question the person may take to the responsible care team.
- **Explicit crisis signal**: a predefined, unambiguous prototype input indicating a possible medical emergency, self-harm risk, or immediate crisis. It is a limited demonstration trigger, not comprehensive risk detection.
  _Avoid_: crisis diagnosis, risk score, comprehensive detection
- **Crisis interruption**: a shared safety state that pauses the active core activity and prioritizes immediate human or local emergency support. The person may return after explicitly acknowledging the notice.
  _Avoid_: lockout, automated intervention
- **Expression draft**: person-confirmed wording prepared for a chosen audience and format.
- **Important matter**: one person, experience, belief, regret, expression of gratitude, or message the person identifies, together with why it matters.
  _Avoid_: archive entry, legacy record
