import sys
from playwright.sync_api import sync_playwright

PAGES = [
    ("/", "01_home_dashboard"),
    ("/policies", "02_policy_tracker"),
    ("/deployments", "03_deployment_dashboard"),
    ("/funding", "04_funding_intelligence"),
    ("/safety", "05_safety_analytics"),
    ("/resources", "06_resource_library"),
    ("/curbside", "07_curbside_management"),
    ("/admin", "08_admin_login"),
]

OUT_DIR = "/home/user/av-hub/screenshots"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            executable_path="/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome",
            args=[
                "--no-proxy-server",
                "--disable-gpu",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )
        page = browser.new_page(viewport={"width": 1440, "height": 900})

        for path, name in PAGES:
            url = f"http://localhost:8000{path}"
            print(f"Capturing {url} ...", flush=True)
            try:
                page.goto(url, wait_until="networkidle", timeout=20000)
                # Extra wait for React to render + charts/maps to load
                page.wait_for_timeout(3000)
                # Take full-page screenshot
                page.screenshot(
                    path=f"{OUT_DIR}/{name}.png",
                    full_page=True,
                )
                print(f"  -> saved {name}.png", flush=True)
            except Exception as e:
                print(f"  -> FAILED: {e}", flush=True)
                # Try a shorter wait fallback
                try:
                    page.wait_for_timeout(2000)
                    page.screenshot(
                        path=f"{OUT_DIR}/{name}.png",
                        full_page=True,
                    )
                    print(f"  -> saved {name}.png (fallback)", flush=True)
                except Exception as e2:
                    print(f"  -> FALLBACK ALSO FAILED: {e2}", flush=True)

        browser.close()
        print("\nDone! All screenshots saved to", OUT_DIR)

if __name__ == "__main__":
    main()
