import { ScraperAuthConfig } from "../../lib/authenticatedScraperService";

export const ALLAFRICA_AUTH_CONFIG: ScraperAuthConfig = {
  loginUrl: "{{articleUrl}}",
  loginDetectionSelector: ".story-inline-login",
  authSteps: [
    {
      type: "waitForSelector",
      selector: "#login_username",
      timeout: 10000,
    },
    {
      type: "type",
      selector: "#login_username",
      value: "{{email}}",
    },
    {
      type: "wait",
      timeout: 300,
    },
    {
      type: "type",
      selector: "#login_password",
      value: "{{password}}",
    },
    {
      type: "wait",
      timeout: 300,
    },
    {
      type: "click",
      selector: 'input.submit.button[name="login"]',
    },
    {
      type: "wait",
      timeout: 5000,
    },
  ],
  postAuthWaitTime: 2000,
};
