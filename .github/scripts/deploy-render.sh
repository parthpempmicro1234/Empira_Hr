#!/usr/bin/env bash
set -euo pipefail

service_name="${1:?service name is required}"
service_id="${2:?service id is required}"
image_url="${3:?image URL is required}"

if [[ -z "${RENDER_API_KEY:-}" ]]; then
  echo "::error::RENDER_API_KEY is required"
  exit 1
fi

render_deploy() {
  local payload="$1"
  local response http_code body

  response="$(
    curl -sS \
      --request POST \
      --url "https://api.render.com/v1/services/${service_id}/deploys" \
      --header "Accept: application/json" \
      --header "Authorization: Bearer ${RENDER_API_KEY}" \
      --header "Content-Type: application/json" \
      --data "$payload" \
      --write-out "\n%{http_code}"
  )"

  http_code="$(tail -n 1 <<<"$response")"
  body="$(sed '$d' <<<"$response")"

  RENDER_HTTP_CODE="$http_code"
  RENDER_RESPONSE_BODY="$body"
}

image_payload="$(jq -n --arg imageUrl "$image_url" '{imageUrl: $imageUrl}')"

echo "Triggering Render image deploy for ${service_name}: ${image_url}"
RENDER_HTTP_CODE=""
RENDER_RESPONSE_BODY=""
render_deploy "$image_payload"

if [[ ! "$RENDER_HTTP_CODE" =~ ^2 ]]; then
  printf '%s\n' "$RENDER_RESPONSE_BODY" >&2
  echo "::error::Render image deploy request failed for ${service_name} with HTTP ${RENDER_HTTP_CODE}"
  exit 1
fi

response="$RENDER_RESPONSE_BODY"

deploy_id="$(jq -r '.id // .deploy.id // .deployId // empty' <<<"$response")"
if [[ -z "$deploy_id" ]]; then
  echo "::error::Render did not return a deploy id for ${service_name}"
  echo "$response"
  exit 1
fi

echo "Render deploy id for ${service_name}: ${deploy_id}"

for attempt in {1..60}; do
  details="$(
    curl -fsS \
      --request GET \
      --url "https://api.render.com/v1/services/${service_id}/deploys/${deploy_id}" \
      --header "Accept: application/json" \
      --header "Authorization: Bearer ${RENDER_API_KEY}"
  )"
  status="$(jq -r '.status // .deploy.status // empty' <<<"$details")"
  echo "${service_name} deploy status: ${status:-unknown} (attempt ${attempt}/60)"

  case "$status" in
    live)
      echo "${service_name} deploy is live"
      exit 0
      ;;
    build_failed|canceled|cancelled|deactivated|pre_deploy_failed|update_failed)
      echo "::error::${service_name} deploy failed with status ${status}"
      echo "$details"
      exit 1
      ;;
  esac

  sleep 20
done

echo "::error::Timed out waiting for ${service_name} deploy ${deploy_id}"
exit 1
