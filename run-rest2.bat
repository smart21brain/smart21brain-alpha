@echo off
cd /d %~dp0
echo Running 33 small files (auto-retry)...
call :run s-001.sql
call :run s-002.sql
call :run s-003.sql
call :run s-004.sql
call :run s-005.sql
call :run s-006.sql
call :run s-007.sql
call :run s-008.sql
call :run s-009.sql
call :run s-010.sql
call :run s-011.sql
call :run s-012.sql
call :run s-013.sql
call :run s-014.sql
call :run s-015.sql
call :run s-016.sql
call :run s-017.sql
call :run s-018.sql
call :run s-019.sql
call :run s-020.sql
call :run s-021.sql
call :run s-022.sql
call :run s-023.sql
call :run s-024.sql
call :run s-025.sql
call :run s-026.sql
call :run s-027.sql
call :run s-028.sql
call :run s-029.sql
call :run s-030.sql
call :run s-031.sql
call :run s-032.sql
call :run s-033.sql
echo ALL DONE & pause & exit /b 0

:run
set TRIES=0
:again
echo === %1 ===
call npx wrangler d1 execute smart21brain-db --remote --yes --file=./d1-rest2/%1
if not errorlevel 1 exit /b 0
set /a TRIES+=1
if %TRIES% GEQ 4 (echo FAILED %1 - see error above & pause & exit 1)
echo retry %TRIES% in 10 seconds... & timeout /t 10 /nobreak >nul
goto again
