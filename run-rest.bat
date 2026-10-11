@echo off
cd /d %~dp0
echo Running 33 small files (auto-retry on error)...
call :run r-001.sql
call :run r-002.sql
call :run r-003.sql
call :run r-004.sql
call :run r-005.sql
call :run r-006.sql
call :run r-007.sql
call :run r-008.sql
call :run r-009.sql
call :run r-010.sql
call :run r-011.sql
call :run r-012.sql
call :run r-013.sql
call :run r-014.sql
call :run r-015.sql
call :run r-016.sql
call :run r-017.sql
call :run r-018.sql
call :run r-019.sql
call :run r-020.sql
call :run r-021.sql
call :run r-022.sql
call :run r-023.sql
call :run r-024.sql
call :run r-025.sql
call :run r-026.sql
call :run r-027.sql
call :run r-028.sql
call :run r-029.sql
call :run r-030.sql
call :run r-031.sql
call :run r-032.sql
call :run r-033.sql
echo ALL DONE & pause & exit /b 0

:run
set TRIES=0
:again
echo === %1 ===
call npx wrangler d1 execute smart21brain-db --remote --yes --file=./d1-rest/%1
if not errorlevel 1 exit /b 0
set /a TRIES+=1
if %TRIES% GEQ 8 (echo FAILED %1 after 8 tries & pause & exit 1)
echo retry %TRIES% in 15 seconds... & timeout /t 15 /nobreak >nul
goto again
