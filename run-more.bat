@echo off
cd /d %~dp0
echo Running 50 small files (auto-retry)...
call :run m-001.sql
call :run m-002.sql
call :run m-003.sql
call :run m-004.sql
call :run m-005.sql
call :run m-006.sql
call :run m-007.sql
call :run m-008.sql
call :run m-009.sql
call :run m-010.sql
call :run m-011.sql
call :run m-012.sql
call :run m-013.sql
call :run m-014.sql
call :run m-015.sql
call :run m-016.sql
call :run m-017.sql
call :run m-018.sql
call :run m-019.sql
call :run m-020.sql
call :run m-021.sql
call :run m-022.sql
call :run m-023.sql
call :run m-024.sql
call :run m-025.sql
call :run m-026.sql
call :run m-027.sql
call :run m-028.sql
call :run m-029.sql
call :run m-030.sql
call :run m-031.sql
call :run m-032.sql
call :run m-033.sql
call :run m-034.sql
call :run m-035.sql
call :run m-036.sql
call :run m-037.sql
call :run m-038.sql
call :run m-039.sql
call :run m-040.sql
call :run m-041.sql
call :run m-042.sql
call :run m-043.sql
call :run m-044.sql
call :run m-045.sql
call :run m-046.sql
call :run m-047.sql
call :run m-048.sql
call :run m-049.sql
call :run m-050.sql
echo ALL DONE & pause & exit /b 0

:run
set TRIES=0
:again
echo === %1 ===
call npx wrangler d1 execute smart21brain-db --remote --yes --file=./d1-more/%1
if not errorlevel 1 exit /b 0
set /a TRIES+=1
if %TRIES% GEQ 4 (echo FAILED %1 - see error above & pause & exit 1)
echo retry %TRIES% in 10 seconds... & timeout /t 10 /nobreak >nul
goto again
