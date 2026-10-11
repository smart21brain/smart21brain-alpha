@echo off
cd /d %~dp0
echo Running 15 chunks...
echo === 01-schema-01.sql ===
call npx wrangler d1 execute smart21brain-db --remote --yes --file=./d1-chunks/01-schema-01.sql
if errorlevel 1 (echo FAILED at 01-schema-01.sql - run this file again, then continue & pause & exit /b 1)
echo === 01-schema-02.sql ===
call npx wrangler d1 execute smart21brain-db --remote --yes --file=./d1-chunks/01-schema-02.sql
if errorlevel 1 (echo FAILED at 01-schema-02.sql - run this file again, then continue & pause & exit /b 1)
echo === 01-schema-03.sql ===
call npx wrangler d1 execute smart21brain-db --remote --yes --file=./d1-chunks/01-schema-03.sql
if errorlevel 1 (echo FAILED at 01-schema-03.sql - run this file again, then continue & pause & exit /b 1)
echo === 01-schema-04.sql ===
call npx wrangler d1 execute smart21brain-db --remote --yes --file=./d1-chunks/01-schema-04.sql
if errorlevel 1 (echo FAILED at 01-schema-04.sql - run this file again, then continue & pause & exit /b 1)
echo === 01-schema-05.sql ===
call npx wrangler d1 execute smart21brain-db --remote --yes --file=./d1-chunks/01-schema-05.sql
if errorlevel 1 (echo FAILED at 01-schema-05.sql - run this file again, then continue & pause & exit /b 1)
echo === 01-schema-06.sql ===
call npx wrangler d1 execute smart21brain-db --remote --yes --file=./d1-chunks/01-schema-06.sql
if errorlevel 1 (echo FAILED at 01-schema-06.sql - run this file again, then continue & pause & exit /b 1)
echo === 01-schema-07.sql ===
call npx wrangler d1 execute smart21brain-db --remote --yes --file=./d1-chunks/01-schema-07.sql
if errorlevel 1 (echo FAILED at 01-schema-07.sql - run this file again, then continue & pause & exit /b 1)
echo === 01-schema-08.sql ===
call npx wrangler d1 execute smart21brain-db --remote --yes --file=./d1-chunks/01-schema-08.sql
if errorlevel 1 (echo FAILED at 01-schema-08.sql - run this file again, then continue & pause & exit /b 1)
echo === 01-schema-09.sql ===
call npx wrangler d1 execute smart21brain-db --remote --yes --file=./d1-chunks/01-schema-09.sql
if errorlevel 1 (echo FAILED at 01-schema-09.sql - run this file again, then continue & pause & exit /b 1)
echo === 02-catalog-01.sql ===
call npx wrangler d1 execute smart21brain-db --remote --yes --file=./d1-chunks/02-catalog-01.sql
if errorlevel 1 (echo FAILED at 02-catalog-01.sql - run this file again, then continue & pause & exit /b 1)
echo === 03-aiml-01.sql ===
call npx wrangler d1 execute smart21brain-db --remote --yes --file=./d1-chunks/03-aiml-01.sql
if errorlevel 1 (echo FAILED at 03-aiml-01.sql - run this file again, then continue & pause & exit /b 1)
echo === 03-aiml-02.sql ===
call npx wrangler d1 execute smart21brain-db --remote --yes --file=./d1-chunks/03-aiml-02.sql
if errorlevel 1 (echo FAILED at 03-aiml-02.sql - run this file again, then continue & pause & exit /b 1)
echo === 03-aiml-03.sql ===
call npx wrangler d1 execute smart21brain-db --remote --yes --file=./d1-chunks/03-aiml-03.sql
if errorlevel 1 (echo FAILED at 03-aiml-03.sql - run this file again, then continue & pause & exit /b 1)
echo === 03-aiml-04.sql ===
call npx wrangler d1 execute smart21brain-db --remote --yes --file=./d1-chunks/03-aiml-04.sql
if errorlevel 1 (echo FAILED at 03-aiml-04.sql - run this file again, then continue & pause & exit /b 1)
echo === 03-aiml-05.sql ===
call npx wrangler d1 execute smart21brain-db --remote --yes --file=./d1-chunks/03-aiml-05.sql
if errorlevel 1 (echo FAILED at 03-aiml-05.sql - run this file again, then continue & pause & exit /b 1)
echo ALL DONE & pause
