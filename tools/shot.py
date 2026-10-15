import asyncio, sys, time
from playwright.async_api import async_playwright

# usage: python3 tools/shot.py URL out.png [js-to-eval-after-load] [wait_ms] [WxH]
async def main():
    url, out = sys.argv[1], sys.argv[2]
    js = sys.argv[3] if len(sys.argv) > 3 else ''
    wait = int(sys.argv[4]) if len(sys.argv) > 4 else 3000
    w, h = map(int, (sys.argv[5] if len(sys.argv) > 5 else '1280x800').split('x'))
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': w, 'height': h})
        pg.on('console', lambda m: print('console:', m.type, m.text[:300]) if m.type in ('error', 'warning', 'log') and 'GPU stall' not in m.text else None)
        pg.on('pageerror', lambda e: print('pageerror:', e))
        t = time.time()
        await pg.goto(url, wait_until='commit', timeout=120000)
        await pg.wait_for_function('window.LC || window.AUDIT || (document.getElementById("err")&&document.getElementById("err").style.display=="block")', timeout=180000)
        print('ready in %.1fs' % (time.time() - t))
        if js:
            print('eval:', await pg.evaluate(js))
        await pg.wait_for_timeout(wait)
        await pg.screenshot(path=out, timeout=240000)
        print('shot %.1fs' % (time.time() - t))
        await b.close()

asyncio.run(main())
