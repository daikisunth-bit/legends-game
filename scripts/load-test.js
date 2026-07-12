import http from "k6/http";
import { check, sleep } from "k6";
export const options = { stages: [{ duration: "20s", target: 5 }, { duration: "40s", target: 20 }, { duration: "20s", target: 0 }], thresholds: { http_req_failed: ["rate<0.02"], http_req_duration: ["p(95)<1500"] } };
const baseUrl = __ENV.BASE_URL || "http://localhost:3001";
const token = __ENV.ACCESS_TOKEN || "";
export default function () {
  const health = http.get(`${baseUrl}/health`);
  check(health, { "health 200": (response) => response.status === 200 });
  if (token) {
    const me = http.get(`${baseUrl}/me`, { headers: { Authorization: `Bearer ${token}` } });
    check(me, { "me 200": (response) => response.status === 200 });
  }
  sleep(1);
}
