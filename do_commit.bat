@echo off
cd /d C:\Users\boost\dragline3d
del .git\index.tmp.lock 2>nul
del .git\index.lock 2>nul
del .git\HEAD.lock 2>nul
git add app/admin/analytics/page.tsx app/admin/orders/[id]/page.tsx app/quote/page.tsx "app/api/convert-step/route.ts" truenas-server.js
git commit -m "Shelly aggregate analytics, remove per-job tracking, fast STEP convert, print_hours display"
git push
echo Done.
pause
