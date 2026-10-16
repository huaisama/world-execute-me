@echo off
rem ===========================================================================
rem  start.cmd  -  run world.execute(me); locally
rem
rem  Double-click this. It finds Python 3, starts the Range-capable server, and
rem  opens the piece in your browser.
rem
rem  Why a server at all, and why THIS one: the piece seeks around inside a
rem  3.3 MB mp3, and <audio> seeking depends on HTTP Range requests. Python's
rem  stock http.server ignores the Range header and answers 200 with the whole
rem  file, so playback works but the timeline silently stops being seekable.
rem  tools/serve.py answers real 206s. That is the entire reason it exists.
rem
rem  Usage:  start.cmd            default port 8899
rem          start.cmd 9000       a different port
rem  Stop:   Ctrl+C in this window
rem
rem  TWO BATCH TRAPS THIS FILE IS WRITTEN AROUND, both learned the hard way:
rem
rem   1. No brackets inside a parenthesised block. The first version embedded a
rem      Python one-liner containing brackets inside a for-loop body; cmd read
rem      the closing bracket as the end of the block and the script died with
rem      "'m' is not recognized as an internal or external command".
rem
rem   2. `py` is probed LAST. Where Python came from the Microsoft Store, py.exe
rem      is a zero-byte app-execution alias; invoking it fails with "The system
rem      cannot execute the specified program" and takes the whole batch file
rem      down with it. python / python3 are real executables when present, so
rem      they are tried first and the script usually never reaches the stub.
rem ===========================================================================
setlocal
cd /d "%~dp0"

set "PORT=%~1"
if "%PORT%"=="" set "PORT=8899"

echo.
echo   world.execute(me);
echo   ------------------------------------------
echo.

rem ---- find a Python 3 ------------------------------------------------------
set "PY="

python -c "import sys;assert sys.version_info[0]==3" >nul 2>&1
if not errorlevel 1 set "PY=python"
if defined PY goto found

python3 -c "import sys;assert sys.version_info[0]==3" >nul 2>&1
if not errorlevel 1 set "PY=python3"
if defined PY goto found

py -3 -c "import sys;assert sys.version_info[0]==3" >nul 2>&1
if not errorlevel 1 set "PY=py -3"
if defined PY goto found

goto nopython

:found
echo   python    %PY%

rem ---- the song is optional, but say so rather than let it look broken ------
if exist "audio\world-execute-me.mp3" goto haveaudio

echo   audio     NOT FOUND
echo.
echo   The piece will run silently and fall back to its internal clock.
echo   To hear it, put your own copy of the track at:
echo       audio\world-execute-me.mp3
echo.
echo   See CREDITS.md - the song is Mili's and is not redistributed here.
echo.
goto audiodone

:haveaudio
echo   audio     found

:audiodone
echo   serving   %CD%
echo   address   http://127.0.0.1:%PORT%/
echo.
echo   Ctrl+C here stops the server.
echo.

rem ---- open the browser once the server is actually up ---------------------
rem  PowerShell does the waiting, because nesting a second `start` inside a
rem  quoted cmd /c string needs quote escaping that is easy to get wrong. This
rem  form has only single quotes inside the double-quoted argument.
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:%PORT%/'"

rem ---- run the server in the foreground so Ctrl+C is the off switch ---------
%PY% tools\serve.py %PORT%

echo.
echo   server stopped.
endlocal
exit /b 0

:nopython
echo   No Python 3 found.
echo.
echo   Install it from https://www.python.org/downloads/ and tick
echo   "Add python.exe to PATH" during setup, then run this again.
echo.
pause
endlocal
exit /b 1
