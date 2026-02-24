# Provisioning Test Plan

## Preconditions
- Run migrations through `sql/027_provisioning_hardening.sql`.
- Configure Stripe webhook to `/api/stripe/webhook`.
- Use a test user email not present in `auth.users`.

## Case 1: Duplicate webhook (`event_id` repeated)
1. Complete checkout once.
2. Re-send the same Stripe event from Stripe Dashboard or CLI (`stripe events resend <event_id>`).
3. Expected:
   - `webhook_events` has one row for `event_id`.
   - `provisioning_jobs` has one row for `stripe_event_id`.
   - No duplicate rows in `clinics`, `memberships`, `subscriptions`.

## Case 2: User double-click checkout button
1. On `/signup/billing`, click checkout button multiple times quickly.
2. Expected:
   - Frontend disables all checkout buttons while request is in-flight.
   - `signup_intents.checkout_session_id` remains stable.
   - Stripe creates one effective checkout session for same `intentId + plan`.

## Case 3: Webhook arrives before checkout return page
1. Complete payment and delay browser redirect (simulate network throttle).
2. Ensure webhook is received before opening `/signup/success`.
3. Expected:
   - `provisioning_jobs.status` reaches `done`.
   - `/signup/success` polling returns `ready: true`.
   - Login succeeds and app access is released.

## Case 4: Failure during provisioning + reprocess
1. Force a failure (example: temporary constraint violation or simulate error in webhook handler).
2. Send webhook.
3. Expected initial state:
   - `provisioning_jobs.status = failed`
   - `provisioning_jobs.error_message` populated.
4. Run server-side `reprocessJob(job_id, caller)` with service/admin caller.
5. Expected after retry:
   - Missing steps are completed.
   - Final status is `done`.

## Case 5: RLS vs service-role behavior
1. With authenticated anon client, try direct insert on `webhook_events` or `provisioning_jobs`.
2. Expected: denied by RLS.
3. Execute same insert using service role.
4. Expected: succeeds.
5. Validate regular app queries still obey clinic scoping via memberships/profile context.
