import asyncio, sys, time, json
from playwright.async_api import async_playwright

# usage: python3 tools/multishot.py URL WxH '[["js", "out.png", wait_ms], ...]'
# One page load, several evaluated variants (e.g. presets / parameter sweeps), each followed by a screenshot.
async def main():
    url, size, jobs = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
    w, h = map(int, size.split('x'))
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': w, 'height': h})
        pg.on('console', lambda m: print('console:', m.type, m.text[:300]) if m.type in ('error', 'warning') and 'GPU stall' not in m.text else None)
        pg.on('pageerror', lambda e: print('pageerror:', e))
        t = time.time()
        await pg.goto(url, wait_until='commit', timeout=120000)
        await pg.wait_for_function('window.LC || (document.getElementById("err")&&document.getElementById("err").style.display=="block")', timeout=180000)
        await pg.wait_for_function('window.__texdone || !window.TEX_BASE', timeout=240000, polling=1000)
        print('ready in %.1fs' % (time.time() - t))
        for js, out, wait in jobs:
            if js:
                r = await pg.evaluate(js)
                if r is not None: print('eval:', str(r)[:300])
            await pg.wait_for_timeout(wait)
            await pg.screenshot(path=out, timeout=240000)
            print('shot', out, '%.1fs' % (time.time() - t))
        await b.close()

asyncio.run(main())
