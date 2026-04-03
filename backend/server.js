const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');
const { WebSocketServer } = require('ws');
const Y = require('yjs');

const PORT = Number(process.env.BACKEND_PORT || 5001);
const HOST = process.env.BACKEND_HOST || '0.0.0.0';

const DATA_ROOT = path.join(__dirname, 'data');
const USER_ROOT = path.join(DATA_ROOT, 'user');

async function ensureBaseDirs() {
  await fsp.mkdir(USER_ROOT, { recursive: true });
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, payload) {
  setCorsHeaders(res);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function normalizeUserPath(unsafePath) {
  const normalized = path.normalize(unsafePath).replace(/^([/\\])+/, '');
  if (normalized.includes('..')) {
    throw new Error('Invalid path');
  }
  return normalized;
}

function resolveDataPath(unsafePath) {
  const safeRelPath = normalizeUserPath(unsafePath);
  return path.join(DATA_ROOT, safeRelPath);
}

function resolveProjectFilePath(projectId, relPath) {
  const safeProjectId = String(projectId || '').trim();
  if (!safeProjectId || safeProjectId.includes('..')) {
    throw new Error('Invalid project id');
  }

  const projectRoot = path.join(USER_ROOT, safeProjectId);
  const relativeFilePath = String(relPath || '').replace(/^([/\\])+/, '');
  const normalizedRel = path.normalize(relativeFilePath);
  if (normalizedRel.includes('..')) {
    throw new Error('Invalid file path');
  }

  return path.join(projectRoot, normalizedRel);
}

async function pathExists(target) {
  try {
    await fsp.access(target);
    return true;
  } catch {
    return false;
  }
}

async function buildTreeFromDir(dirPath) {
  const entries = await fsp.readdir(dirPath, { withFileTypes: true });
  const tree = {};

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      tree[entry.name] = await buildTreeFromDir(fullPath);
    } else {
      tree[entry.name] = null;
    }
  }

  return tree;
}

async function getTreePayload() {
  await ensureBaseDirs();
  const projectDirs = await fsp.readdir(USER_ROOT, { withFileTypes: true });
  const tree = {};

  for (const entry of projectDirs) {
    if (!entry.isDirectory()) {
      continue;
    }

    const projectPath = path.join(USER_ROOT, entry.name);
    tree[entry.name] = await buildTreeFromDir(projectPath);
  }

  return { tree };
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error('Body too large'));
      }
    });

    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });
}

function runProcess(command, args = [], options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      shell: false,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    const timeoutMs = Number(options.timeoutMs || 10000);

    const finalize = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(result);
    };

    const timeout = setTimeout(() => {
      try {
        child.kill();
      } catch {
        // ignore kill failures
      }
      finalize({ stdout, stderr: `${stderr}\nExecution timed out after ${timeoutMs}ms`, exitCode: null, timedOut: true });
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      finalize({ stdout, stderr: error.message || String(error), exitCode: 1, timedOut: false });
    });

    child.on('close', (exitCode) => {
      finalize({ stdout, stderr, exitCode, timedOut: false });
    });
  });
}

function runShellCommand(command, options = {}) {
  const shellExecutable = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
  const shellArgs = process.platform === 'win32' ? ['/c', command] : ['-lc', command];
  return runProcess(shellExecutable, shellArgs, options);
}

function toPosixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

async function executeCodeFile(projectId, relPath) {
  const fullPath = resolveProjectFilePath(projectId, relPath);
  const exists = await pathExists(fullPath);
  if (!exists) {
    throw new Error(`File not found: ${relPath}`);
  }

  const fileExt = path.extname(fullPath).slice(1).toLowerCase();
  const workDir = path.dirname(fullPath);
  const baseName = path.basename(fullPath, path.extname(fullPath));

  if (fileExt === 'js') {
    return runProcess(process.execPath, [fullPath], { cwd: workDir, timeoutMs: 10000 });
  }

  if (fileExt === 'py') {
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
    return runProcess(pythonCommand, [fullPath], { cwd: workDir, timeoutMs: 10000 });
  }

  if (fileExt === 'c' || fileExt === 'cpp' || fileExt === 'cc' || fileExt === 'cxx') {
    const compiler = fileExt === 'c' ? 'gcc' : 'g++';
    const outputFile = path.join(workDir, `${baseName}${process.platform === 'win32' ? '.exe' : ''}`);

    const compileResult = await runProcess(compiler, [fullPath, '-o', outputFile], {
      cwd: workDir,
      timeoutMs: 20000,
    });

    if (compileResult.exitCode !== 0) {
      return {
        ...compileResult,
        stdout: compileResult.stdout,
        stderr: compileResult.stderr || 'Compilation failed',
        compiled: false,
      };
    }

    const runResult = await runProcess(outputFile, [], {
      cwd: workDir,
      timeoutMs: 10000,
    });

    try {
      await fsp.unlink(outputFile);
    } catch {
      // ignore cleanup errors
    }

    return {
      ...runResult,
      compiled: true,
    };
  }

  throw new Error(`Execution is not supported for .${fileExt || 'unknown'} files yet`);
}

function broadcastJson(wss, payload) {
  const message = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}

function getOrCreateRoom(rooms, roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      messages: [],
      members: new Set(),
    });
  }
  return rooms.get(roomId);
}

function broadcastToRoom(rooms, roomId, payload) {
  const room = rooms.get(roomId);
  if (!room) return;

  const serialized = JSON.stringify(payload);
  for (const client of room.members) {
    if (client.readyState === 1) {
      client.send(serialized);
    }
  }
}

function setupHttpServer(wss) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);

      if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method === 'GET' && url.pathname === '/health') {
        sendJson(res, 200, { ok: true, service: 'collabwriter-backend' });
        return;
      }

      if (req.method === 'GET' && url.pathname === '/files') {
        const payload = await getTreePayload();
        sendJson(res, 200, payload);
        return;
      }

      if (req.method === 'GET' && url.pathname === '/files/content') {
        const rawPath = url.searchParams.get('path');
        const projectId = url.searchParams.get('pId');

        if (!rawPath || !projectId) {
          sendJson(res, 400, { error: 'Missing path or pId' });
          return;
        }

        const fullPath = resolveProjectFilePath(projectId, rawPath);
        const exists = await pathExists(fullPath);
        if (!exists) {
          sendJson(res, 200, { content: '' });
          return;
        }

        const content = await fsp.readFile(fullPath, 'utf8');
        sendJson(res, 200, { content });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/files/content') {
        const body = await readBody(req);
        const { pId, path: filePath, content } = body;

        if (!pId || !filePath) {
          sendJson(res, 400, { error: 'Missing pId or path' });
          return;
        }

        const fullPath = resolveProjectFilePath(pId, filePath);
        await fsp.mkdir(path.dirname(fullPath), { recursive: true });
        await fsp.writeFile(fullPath, String(content || ''), 'utf8');

        broadcastJson(wss, { type: 'file:refresh' });
        sendJson(res, 200, { ok: true });
        return;
      }

      sendJson(res, 404, { error: 'Not found' });
    } catch (error) {
      sendJson(res, 500, { error: error.message || 'Internal Server Error' });
    }
  });
}

function setupWebSocket(server, wss) {
  const chatRooms = new Map();
  const socketRooms = new Map();
  const documentRooms = new Map();
  const socketDocumentRooms = new Map();
  const documentSnapshots = new Map();
  const yDocuments = new Map();
  const terminalSessions = new Map();

  const getTerminalSession = (projectId, terminalId) => {
    const normalizedProjectId = String(projectId || '').trim();
    const normalizedTerminalId = String(terminalId || '0').trim() || '0';
    const key = `${normalizedProjectId}:${normalizedTerminalId}`;

    if (!terminalSessions.has(key)) {
      const projectRoot = path.join(USER_ROOT, normalizedProjectId);
      terminalSessions.set(key, {
        key,
        projectId: normalizedProjectId,
        terminalId: normalizedTerminalId,
        projectRoot,
        cwd: projectRoot,
      });
    }

    return terminalSessions.get(key);
  };

  const getDisplayCwd = (session) => {
    const rel = path.relative(session.projectRoot, session.cwd);
    if (!rel) {
      return '/';
    }
    return `/${toPosixPath(rel)}`;
  };

  const getPrompt = (session) => `${getDisplayCwd(session)} $ `;

  const sendTerminalData = (projectId, terminalId, data) => {
    broadcastJson(wss, {
      type: 'terminal:data',
      projectId: String(projectId || ''),
      terminalId: String(terminalId || '0'),
      data,
    });
  };

  const encodeUint8ArrayToBase64 = (data) => Buffer.from(data).toString('base64');
  const decodeBase64ToUint8Array = (encoded) => new Uint8Array(Buffer.from(String(encoded || ''), 'base64'));

  const getOrCreateYDocument = (docId) => {
    if (!yDocuments.has(docId)) {
      yDocuments.set(docId, new Y.Doc());
    }
    return yDocuments.get(docId);
  };

  const leaveRoomForSocket = (socket, roomId) => {
    const room = chatRooms.get(roomId);
    if (!room) return;

    room.members.delete(socket);
    const joinedRooms = socketRooms.get(socket);
    if (joinedRooms) {
      joinedRooms.delete(roomId);
      if (joinedRooms.size === 0) {
        socketRooms.delete(socket);
      }
    }

    if (room.members.size === 0) {
      // Ephemeral behavior: clear room chat when everyone leaves.
      chatRooms.delete(roomId);
      return;
    }

    broadcastToRoom(chatRooms, roomId, {
      type: 'chat:presence',
      roomId,
      count: room.members.size,
    });
  };

  const getOrCreateDocumentRoom = (docId) => {
    if (!documentRooms.has(docId)) {
      documentRooms.set(docId, new Set());
    }
    return documentRooms.get(docId);
  };

  const leaveDocumentForSocket = (socket, docId) => {
    const room = documentRooms.get(docId);
    if (!room) {
      return;
    }

    room.delete(socket);

    const joinedDocs = socketDocumentRooms.get(socket);
    if (joinedDocs) {
      joinedDocs.delete(docId);
      if (joinedDocs.size === 0) {
        socketDocumentRooms.delete(socket);
      }
    }

    if (room.size === 0) {
      documentRooms.delete(docId);
    }
  };

  const broadcastToDocumentRoom = (docId, payload, exceptSocket = null) => {
    const room = documentRooms.get(docId);
    if (!room || room.size === 0) {
      return;
    }

    const message = JSON.stringify(payload);
    for (const client of room) {
      if (exceptSocket && client === exceptSocket) {
        continue;
      }
      if (client.readyState === 1) {
        client.send(message);
      }
    }
  };

  wss.on('connection', (socket) => {
    socket.on('message', async (raw) => {
      try {
        const message = JSON.parse(String(raw));
        const type = message?.type;
        const data = message?.data || {};

        if (type === 'project:started') {
          const projectId = data.id;
          if (projectId) {
            const dir = path.join(USER_ROOT, String(projectId));
            await fsp.mkdir(dir, { recursive: true });
            broadcastJson(wss, { type: 'file:refresh' });
          }
          return;
        }

        if (type === 'file:change') {
          const projectId = data.pId;
          const relPath = data.path;
          if (!projectId || !relPath) return;

          const fullPath = resolveProjectFilePath(projectId, relPath);
          await fsp.mkdir(path.dirname(fullPath), { recursive: true });
          await fsp.writeFile(fullPath, String(data.content || ''), 'utf8');
          broadcastJson(wss, { type: 'file:refresh' });
          return;
        }

        if (type === 'file:create') {
          const fullPath = resolveDataPath(data.filePath || '');
          await fsp.mkdir(path.dirname(fullPath), { recursive: true });
          await fsp.writeFile(fullPath, '', 'utf8');
          broadcastJson(wss, { type: 'file:refresh' });
          return;
        }

        if (type === 'folder:create') {
          const fullPath = resolveDataPath(data.filePath || '');
          await fsp.mkdir(fullPath, { recursive: true });
          broadcastJson(wss, { type: 'file:refresh' });
          return;
        }

        if (type === 'file:delete') {
          const fullPath = resolveDataPath(data.filePath || '');
          if (await pathExists(fullPath)) {
            await fsp.unlink(fullPath);
          }
          broadcastJson(wss, { type: 'file:refresh' });
          return;
        }

        if (type === 'folder:delete') {
          const fullPath = resolveDataPath(data.filePath || '');
          if (await pathExists(fullPath)) {
            await fsp.rm(fullPath, { recursive: true, force: true });
          }
          broadcastJson(wss, { type: 'file:refresh' });
          return;
        }

        if (type === 'file:rename') {
          const oldPath = resolveDataPath(data.oldPath || '');
          const newPath = resolveDataPath(data.newPath || '');
          await fsp.mkdir(path.dirname(newPath), { recursive: true });
          if (await pathExists(oldPath)) {
            await fsp.rename(oldPath, newPath);
          }
          broadcastJson(wss, { type: 'file:refresh' });
          return;
        }

        if (type === 'terminal:write') {
          const projectId = String(message.projectId || data.projectId || '').trim();
          const terminalId = String(message.terminalId || data.terminalId || '0');
          const rawCommand = String(message.command ?? data.command ?? data ?? '').trim();

          if (!projectId) {
            return;
          }

          const session = getTerminalSession(projectId, terminalId);
          await fsp.mkdir(session.projectRoot, { recursive: true });

          if (!rawCommand) {
            sendTerminalData(projectId, terminalId, getPrompt(session));
            return;
          }

          const [baseCommand, ...rest] = rawCommand.split(/\s+/);
          const normalizedCommand = baseCommand.toLowerCase();

          if (normalizedCommand === 'clear') {
            sendTerminalData(projectId, terminalId, '\x1b[2J\x1b[H');
            sendTerminalData(projectId, terminalId, getPrompt(session));
            return;
          }

          if (normalizedCommand === 'help') {
            sendTerminalData(
              projectId,
              terminalId,
              'Commands: help, pwd, ls, dir, cd <path>, clear, and any shell command.\r\n'
            );
            sendTerminalData(projectId, terminalId, getPrompt(session));
            return;
          }

          if (normalizedCommand === 'pwd') {
            sendTerminalData(projectId, terminalId, `${getDisplayCwd(session)}\r\n`);
            sendTerminalData(projectId, terminalId, getPrompt(session));
            return;
          }

          if (normalizedCommand === 'ls' || normalizedCommand === 'dir') {
            const entries = await fsp.readdir(session.cwd, { withFileTypes: true });
            const lines = entries
              .map((entry) => (entry.isDirectory() ? `[D] ${entry.name}` : `    ${entry.name}`))
              .join('\r\n');
            sendTerminalData(projectId, terminalId, `${lines || '(empty)'}\r\n`);
            sendTerminalData(projectId, terminalId, getPrompt(session));
            return;
          }

          if (normalizedCommand === 'cd') {
            const targetArg = rest.join(' ').trim() || '/';
            const nextPath = targetArg.startsWith('/')
              ? path.resolve(session.projectRoot, `.${targetArg}`)
              : path.resolve(session.cwd, targetArg);

            const relativeToProject = path.relative(session.projectRoot, nextPath);
            const outsideProject = relativeToProject.startsWith('..') || path.isAbsolute(relativeToProject);
            if (outsideProject || !(await pathExists(nextPath))) {
              sendTerminalData(projectId, terminalId, `cd: no such directory: ${targetArg}\r\n`);
              sendTerminalData(projectId, terminalId, getPrompt(session));
              return;
            }

            const stat = await fsp.stat(nextPath);
            if (!stat.isDirectory()) {
              sendTerminalData(projectId, terminalId, `cd: not a directory: ${targetArg}\r\n`);
              sendTerminalData(projectId, terminalId, getPrompt(session));
              return;
            }

            session.cwd = nextPath;
            sendTerminalData(projectId, terminalId, `${getDisplayCwd(session)}\r\n`);
            sendTerminalData(projectId, terminalId, getPrompt(session));
            return;
          }

          const shellResult = await runShellCommand(rawCommand, {
            cwd: session.cwd,
            timeoutMs: 15000,
          });

          const output = `${shellResult.stdout || ''}${shellResult.stderr || ''}`;
          sendTerminalData(projectId, terminalId, `${output || '\r\n'}\r\n`);
          sendTerminalData(projectId, terminalId, getPrompt(session));
          return;
        }

        if (type === 'code:execute') {
          const projectId = String(message.projectId || data.projectId || '').trim();
          const relPath = String(message.path || data.path || '').trim();
          const terminalId = String(message.terminalId || data.terminalId || '0');

          if (!projectId || !relPath) {
            sendTerminalData(projectId, terminalId, '\r\nMissing project id or file path for execution.\r\n');
            return;
          }

          const session = getTerminalSession(projectId, terminalId);
          await fsp.mkdir(session.projectRoot, { recursive: true });

          sendTerminalData(projectId, terminalId, `\r\n> Running ${relPath}\r\n`);

          try {
            const result = await executeCodeFile(projectId, relPath);
            const output = `${result.stdout || ''}${result.stderr || ''}`.trim() || 'Process finished with no output.';
            const exitLabel = result.timedOut
              ? 'Timed out'
              : typeof result.exitCode === 'number'
                ? `Exit code ${result.exitCode}`
                : 'Finished';

            sendTerminalData(projectId, terminalId, `\r\n${output}\r\n${exitLabel}\r\n`);
            sendTerminalData(projectId, terminalId, getPrompt(session));
          } catch (error) {
            sendTerminalData(projectId, terminalId, `\r\nExecution failed: ${error.message || 'Unknown error'}\r\n`);
            sendTerminalData(projectId, terminalId, getPrompt(session));
          }
          return;
        }

        if (type === 'get-document') {
          const docId = String(message.id || data.id || '').trim();
          if (!docId) {
            return;
          }

          const room = getOrCreateDocumentRoom(docId);
          room.add(socket);

          if (!socketDocumentRooms.has(socket)) {
            socketDocumentRooms.set(socket, new Set());
          }
          socketDocumentRooms.get(socket).add(docId);

          if (documentSnapshots.has(docId)) {
            socket.send(
              JSON.stringify({
                type: 'load-document',
                id: docId,
                data: documentSnapshots.get(docId),
              })
            );
          }
          return;
        }

        if (type === 'send-changes') {
          const docId = String(message.id || data.id || '').trim();
          const delta = message.delta || data.delta;
          if (!docId || !delta) {
            return;
          }

          broadcastToDocumentRoom(
            docId,
            {
              type: 'receive-changes',
              id: docId,
              delta,
            },
            socket
          );
          return;
        }

        if (type === 'yjs-state-vector') {
          const docId = String(message.id || data.id || '').trim();
          const encodedStateVector = String(message.stateVector || data.stateVector || '');
          if (!docId) {
            return;
          }

          const room = getOrCreateDocumentRoom(docId);
          room.add(socket);
          if (!socketDocumentRooms.has(socket)) {
            socketDocumentRooms.set(socket, new Set());
          }
          socketDocumentRooms.get(socket).add(docId);

          const yDoc = getOrCreateYDocument(docId);
          const stateVector = encodedStateVector ? decodeBase64ToUint8Array(encodedStateVector) : Y.encodeStateVector(new Y.Doc());
          const missingUpdate = Y.encodeStateAsUpdate(yDoc, stateVector);

          if (missingUpdate.length > 0) {
            socket.send(
              JSON.stringify({
                type: 'yjs-sync-update',
                id: docId,
                update: encodeUint8ArrayToBase64(missingUpdate),
              })
            );
          }
          return;
        }

        if (type === 'yjs-update') {
          const docId = String(message.id || data.id || '').trim();
          const encodedUpdate = String(message.update || data.update || '');
          if (!docId || !encodedUpdate) {
            return;
          }

          const update = decodeBase64ToUint8Array(encodedUpdate);
          if (update.length === 0) {
            return;
          }

          const yDoc = getOrCreateYDocument(docId);
          Y.applyUpdate(yDoc, update);

          broadcastToDocumentRoom(
            docId,
            {
              type: 'yjs-remote-update',
              id: docId,
              update: encodedUpdate,
            },
            socket
          );
          return;
        }

        if (type === 'save-document') {
          const docId = String(message.id || data.id || '').trim();
          const nextData = message.data ?? data.data;
          if (!docId || nextData === undefined) {
            return;
          }

          documentSnapshots.set(docId, nextData);
          return;
        }

        if (type === 'cursor-update') {
          const docId = String(message.id || data.id || '').trim();
          if (!docId) {
            return;
          }

          const payload = {
            type: 'cursor-update',
            id: docId,
            userId: String(message.userId || data.userId || ''),
            userName: String(message.userName || data.userName || 'Guest'),
            email: String(message.email || data.email || ''),
            color: String(message.color || data.color || '#2563eb'),
            cursorPosition: Number(message.cursorPosition ?? data.cursorPosition ?? 0),
            row: Number(message.row ?? data.row ?? 0),
            column: Number(message.column ?? data.column ?? 0),
            path: String(message.path || data.path || ''),
          };

          broadcastToDocumentRoom(docId, payload, socket);
          return;
        }

        if (type === 'chat:join') {
          const roomId = String(data.roomId || '').trim();
          if (!roomId) return;

          const room = getOrCreateRoom(chatRooms, roomId);
          room.members.add(socket);

          if (!socketRooms.has(socket)) {
            socketRooms.set(socket, new Set());
          }
          socketRooms.get(socket).add(roomId);

          socket.send(
            JSON.stringify({
              type: 'chat:history',
              roomId,
              messages: room.messages,
            })
          );

          broadcastToRoom(chatRooms, roomId, {
            type: 'chat:presence',
            roomId,
            count: room.members.size,
          });
          return;
        }

        if (type === 'chat:leave') {
          const roomId = String(data.roomId || '').trim();
          if (!roomId) return;
          leaveRoomForSocket(socket, roomId);
          return;
        }

        if (type === 'chat:send') {
          const roomId = String(data.roomId || '').trim();
          const userId = String(data.userId || 'unknown');
          const userName = String(data.userName || 'Guest');
          const text = String(data.text || '').trim();
          if (!roomId || !text) return;

          const room = getOrCreateRoom(chatRooms, roomId);
          room.members.add(socket);

          const chatMessage = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            userId,
            userName,
            text,
            createdAt: Date.now(),
          };

          room.messages.push(chatMessage);
          if (room.messages.length > 300) {
            room.messages = room.messages.slice(-300);
          }

          broadcastToRoom(chatRooms, roomId, {
            type: 'chat:message',
            roomId,
            message: chatMessage,
          });
          return;
        }
      } catch (error) {
        socket.send(JSON.stringify({ type: 'error', message: error.message || 'Invalid message' }));
      }
    });

    socket.on('close', () => {
      const rooms = socketRooms.get(socket);
      if (rooms && rooms.size > 0) {
        for (const roomId of Array.from(rooms)) {
          leaveRoomForSocket(socket, roomId);
        }
      }

      const documentIds = socketDocumentRooms.get(socket);
      if (documentIds && documentIds.size > 0) {
        for (const docId of Array.from(documentIds)) {
          leaveDocumentForSocket(socket, docId);
        }
      }
    });
  });

  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });
}

async function start() {
  await ensureBaseDirs();

  const wss = new WebSocketServer({ noServer: true });
  const server = setupHttpServer(wss);
  setupWebSocket(server, wss);

  server.listen(PORT, HOST, () => {
    console.log(`[collabwriter-backend] http://localhost:${PORT}`);
    console.log('[collabwriter-backend] WebSocket endpoint is ws://localhost:' + PORT);
  });
}

start().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});
