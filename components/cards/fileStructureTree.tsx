"use client";
import React, { useEffect, useState, useRef } from 'react';
import 'devicon/devicon.min.css';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { updateDocumentPermission } from '@/lib/actions/document.action';

const iconMapping: { [key: string]: string } = {
  js: 'devicon-javascript-plain colored',
  py: 'devicon-python-plain colored',
  java: 'devicon-java-plain colored',
  html: 'devicon-html5-plain colored',
  css: 'devicon-css3-plain colored',
  json: 'devicon-json-plain colored',
  jsx: 'devicon-react-plain colored',
  ts: 'devicon-typescript-plain colored',
  tsx: 'devicon-typescript-plain colored',
  md: 'devicon-markdown-plain colored',
  php: 'devicon-php-plain colored',
  sql: 'devicon-mysql-plain colored',
  ruby: 'devicon-ruby-plain colored',
  go: 'devicon-go-plain colored',
  c: 'devicon-c-plain colored',
  cpp: 'devicon-cplusplus-plain colored',
  abap: 'devicon-devicon-plain colored',
  abc: 'devicon-devicon-plain colored',
  actionscript: 'devicon-devicon-plain colored',
  ada: 'devicon-devicon-plain colored',
  alda: 'devicon-devicon-plain colored',
  apache_conf: 'devicon-apache-plain colored',
  apex: 'devicon-devicon-plain colored',
  applescript: 'devicon-apple-plain colored',
  aql: 'devicon-devicon-plain colored',
  asciidoc: 'devicon-devicon-plain colored',
  asl: 'devicon-devicon-plain colored',
  assembly_arm32: 'devicon-devicon-plain colored',
  assembly_x86: 'devicon-devicon-plain colored',
  astro: 'devicon-devicon-plain colored',
  autohotkey: 'devicon-devicon-plain colored',
  batchfile: 'devicon-windows8-original',
  bibtex: 'devicon-devicon-plain colored',
  c9search: 'devicon-devicon-plain colored',
  c_cpp: 'devicon-cplusplus-plain colored',
  cirru: 'devicon-devicon-plain colored',
  clojure: 'devicon-clojure-plain colored',
  cobol: 'devicon-devicon-plain colored',
  coffee: 'devicon-coffeescript-plain colored',
  coldfusion: 'devicon-devicon-plain colored',
  crystal: 'devicon-devicon-plain colored',
  csharp: 'devicon-csharp-plain colored',
  csound_document: 'devicon-devicon-plain colored',
  csound_orchestra: 'devicon-devicon-plain colored',
  csound_score: 'devicon-devicon-plain colored',
  csp: 'devicon-devicon-plain colored',
  curly: 'devicon-devicon-plain colored',
  cuttlefish: 'devicon-devicon-plain colored',
  d: 'devicon-d-plain colored',
  dart: 'devicon-dart-plain colored',
  diff: 'devicon-devicon-plain colored',
  django: 'devicon-django-plain colored',
  dockerfile: 'devicon-docker-plain colored',
  dot: 'devicon-graphviz-plain colored',
  drools: 'devicon-devicon-plain colored',
  edifact: 'devicon-devicon-plain colored',
  eiffel: 'devicon-devicon-plain colored',
  ejs: 'devicon-devicon-plain colored',
  elixir: 'devicon-elixir-plain colored',
  elm: 'devicon-elm-plain colored',
  erlang: 'devicon-erlang-plain colored',
  flix: 'devicon-devicon-plain colored',
  forth: 'devicon-devicon-plain colored',
  fortran: 'devicon-devicon-plain colored',
  fsharp: 'devicon-fsharp-plain colored',
  fsl: 'devicon-devicon-plain colored',
  ftl: 'devicon-devicon-plain colored',
  gcode: 'devicon-devicon-plain colored',
  gherkin: 'devicon-devicon-plain colored',
  gitignore: 'devicon-git-plain colored',
  glsl: 'devicon-devicon-plain colored',
  gobstones: 'devicon-devicon-plain colored',
  graphqlschema: 'devicon-graphql-plain colored',
  groovy: 'devicon-groovy-plain colored',
  haml: 'devicon-devicon-plain colored',
  handlebars: 'devicon-handlebars-plain colored',
  haskell: 'devicon-haskell-plain colored',
  haskell_cabal: 'devicon-devicon-plain colored',
  haxe: 'devicon-devicon-plain colored',
  hjson: 'devicon-devicon-plain colored',
  html_elixir: 'devicon-html5-plain colored',
  html_ruby: 'devicon-html5-plain colored',
  ini: 'devicon-devicon-plain colored',
  io: 'devicon-devicon-plain colored',
  ion: 'devicon-devicon-plain colored',
  jack: 'devicon-devicon-plain colored',
  jade: 'devicon-devicon-plain colored',
  jexl: 'devicon-devicon-plain colored',
  json5: 'devicon-json-plain colored',
  jsoniq: 'devicon-devicon-plain colored',
  jsp: 'devicon-devicon-plain colored',
  jssm: 'devicon-devicon-plain colored',
  julia: 'devicon-julia-plain colored',
  kotlin: 'devicon-kotlin-plain colored',
  latex: 'devicon-latex-plain colored',
  latte: 'devicon-devicon-plain colored',
  less: 'devicon-less-plain colored-wordmark',
  liquid: 'devicon-devicon-plain colored',
  lisp: 'devicon-devicon-plain colored',
  livescript: 'devicon-devicon-plain colored',
  logiql: 'devicon-devicon-plain colored',
  logtalk: 'devicon-devicon-plain colored',
  lsl: 'devicon-devicon-plain colored',
  lua: 'devicon-lua-plain colored',
  luapage: 'devicon-devicon-plain colored',
  lucene: 'devicon-devicon-plain colored',
  makefile: 'devicon-devicon-plain colored',
  mask: 'devicon-devicon-plain colored',
  matlab: 'devicon-matlab-plain colored',
  maze: 'devicon-devicon-plain colored',
  mediawiki: 'devicon-devicon-plain colored',
  mel: 'devicon-devicon-plain colored',
  mips: 'devicon-devicon-plain colored',
  mixal: 'devicon-devicon-plain colored',
  mushcode: 'devicon-devicon-plain colored',
  mysql: 'devicon-mysql-plain colored',
  nasal: 'devicon-devicon-plain colored',
  nginx: 'devicon-nginx-plain colored',
  nim: 'devicon-devicon-plain colored',
  nix: 'devicon-devicon-plain colored',
  nsis: 'devicon-devicon-plain colored',
  nunjucks: 'devicon-devicon-plain colored',
  objectivec: 'devicon-objectivec-plain colored',
  ocaml: 'devicon-ocaml-plain colored',
  odin: 'devicon-devicon-plain colored',
  partiql: 'devicon-devicon-plain colored',
  pascal: 'devicon-devicon-plain colored',
  perl: 'devicon-perl-plain colored',
  pgsql: 'devicon-postgresql-plain colored',
  php_laravel_blade: 'devicon-laravel-plain colored',
  pig: 'devicon-devicon-plain colored',
  plain_text: 'devicon-devicon-plain colored',
  txt: 'devicon-devicon-plain colored',
  plsql: 'devicon-devicon-plain colored',
  powershell: 'devicon-devicon-plain colored',
  praat: 'devicon-devicon-plain colored',
  prisma: 'devicon-devicon-plain colored',
  prolog: 'devicon-devicon-plain colored',
  properties: 'devicon-devicon-plain colored',
  protobuf: 'devicon-devicon-plain colored',
  prql: 'devicon-devicon-plain colored',
  puppet: 'devicon-puppet-plain colored',
  qml: 'devicon-devicon-plain colored',
  r: 'devicon-r-plain colored',
  raku: 'devicon-devicon-plain colored',
  razor: 'devicon-devicon-plain colored',
  rdoc: 'devicon-devicon-plain colored',
  red: 'devicon-devicon-plain colored',
  redshift: 'devicon-devicon-plain colored',
  rhtml: 'devicon-devicon-plain colored',
  robot: 'devicon-devicon-plain colored',
  rst: 'devicon-devicon-plain colored',
  rust: 'devicon-rust-plain colored',
  sac: 'devicon-devicon-plain colored',
  sass: 'devicon-sass-plain colored',
  scad: 'devicon-devicon-plain colored',
  scala: 'devicon-scala-plain colored',
  scheme: 'devicon-devicon-plain colored',
  scrypt: 'devicon-devicon-plain colored',
  scss: 'devicon-sass-original',
  sh: 'devicon-linux-plain colored',
  sjs: 'devicon-devicon-plain colored',
  slim: 'devicon-devicon-plain colored',
  smarty: 'devicon-devicon-plain colored',
  smithy: 'devicon-devicon-plain colored',
  snippets: 'devicon-devicon-plain colored',
  soy_template: 'devicon-devicon-plain colored',
  space: 'devicon-devicon-plain colored',
  sparql: 'devicon-devicon-plain colored',
  sqlserver: 'devicon-microsoftsqlserver-plain colored',
  stylus: 'devicon-stylus-plain colored',
  svg: 'devicon-devicon-plain colored',
  swift: 'devicon-swift-plain colored',
  tcl: 'devicon-devicon-plain colored',
  terraform: 'devicon-devicon-plain colored',
  tex: 'devicon-devicon-plain colored',
  text: 'devicon-devicon-plain colored',
  textile: 'devicon-devicon-plain colored',
  toml: 'devicon-devicon-plain colored',
  turtle: 'devicon-devicon-plain colored',
  twig: 'devicon-devicon-plain colored',
  vala: 'devicon-devicon-plain colored',
  vbscript: 'devicon-devicon-plain colored',
  velocity: 'devicon-devicon-plain colored',
  verilog: 'devicon-devicon-plain colored',
  vhdl: 'devicon-devicon-plain colored',
  visualforce: 'devicon-devicon-plain colored',
  vue: 'devicon-vuejs-plain colored',
  wollok: 'devicon-devicon-plain colored',
  xml: 'devicon-devicon-plain colored',
  xquery: 'devicon-devicon-plain colored',
  yaml: 'devicon-devicon-plain colored',
  zeek: 'devicon-devicon-plain colored',
  zig: 'devicon-devicon-plain colored',
};


const ws = new WebSocket(
  process.env.NEXT_PUBLIC_SOCKET_BACKEND_URL || "ws://localhost:5001"
);
const BACKEND_HTTP_URL = (process.env.NEXT_PUBLIC_SOCKET_BACKEND_URL || "ws://localhost:5001").replace(/^ws/i, "http");

const FileTreeNode = ({ fileName, nodes, onSelect, path, searchSelectedPath, setSearchResult, searchResult, pId, newFolderCreatedPath, setNewFolderCreatedPath, newFileCreatedPath, setNewFileCreatedPath, isDarkMode, bgcolor }: any) => {
  console.log(bgcolor)
  const [isExpanded, setIsExpanded] = useState(false);
  const [menuStyle, setMenuStyle] = useState<any>({ display: "none", top: 0, left: 0, });
  const [folderMenuStyle, setFolderMenuStyle] = useState<any>({ display: "none", top: 0, left: 0, });
  const [isRenaming, setIsRenaming] = useState(false);
  const [isFolderRenaming, setIsFolderRenaming] = useState(false);
  const [newFileName, setNewFileName] = useState(fileName);
  const [newFolderName, setNewFolderName] = useState(fileName);
  const [handleOpenOptionModal, setHandleOpenOptionModal] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [input, setInput] = useState('');
  const [accessEmails, setAccessEmails] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const folderMenuRef = useRef<HTMLDivElement | null>(null);
  

  const isFolder = nodes !== null && typeof nodes === "object";
  const childNodeEntries = isFolder ? Object.entries(nodes as Record<string, any>) : [];
  const fileExtension = newFileName.split('.').pop();

  
  useEffect(() => {
    if (searchSelectedPath === "") {
      setSearchResult([]);
    }
    if (searchSelectedPath !== "") {
      setIsExpanded(true);
    }
    if (path.includes(searchSelectedPath) && !isFolder) {
      if (!searchResult.includes(path)) {
        setSearchResult([...searchResult, path]);
      }
      if (searchSelectedPath === "") {
        setSearchResult([]);
      }
    }

    return () => {
      if (searchSelectedPath === "") {
        setIsExpanded(false);
      }
    };
  }, [searchSelectedPath]);

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  const handleRightClick = (event: any, filePath: any) => {
    event.preventDefault();
    setMenuStyle({
      display: "block",
      top: event.clientY,
      left: event.clientX,
    });
  };

  const handleFolderRightClick = (event: any, filePath: any) => {
    event.preventDefault();
    setFolderMenuStyle({
      display: "block",
      top: event.clientY,
      left: event.clientX,
    });
  };

  const handleMenuClick = (action: any, filePath: any) => {
    console.log(action, filePath);
    switch (action) {
      case "rename":
        setIsRenaming(true);
        break;
      case "delete":
        console.log("Delete", filePath);
        handleDeleteFile(filePath);
        break;
      case "manage-access":
        setHandleOpenOptionModal(true);
        break;
      default:
        break;
    }
  };

  const handleFolderMenuClick = (action: any, filePath: any) => {
    console.log(action, filePath);
    switch (action) {
      case "rename":
        setIsFolderRenaming(true);
        break;
      case "delete":
        console.log("Delete", filePath);
        handleDeleteFolder(filePath);
        break;
      case "create-folder":
        console.log("Delete", filePath);
        handleCreateFolder(filePath);
        break;
      case "create-file":
        console.log("Delete", filePath);
        handleCreateFile(filePath);
        break;
      case "manage-access":
        setHandleOpenOptionModal(true);
        break;
      default:
        break;
    }
  };

  const handleAddEmail = () => {
    if (!input.trim()) return;
    if (accessEmails.includes(input.trim())) return;
    setAccessEmails([...accessEmails, input.trim()]);
    setInput('');
  };

  const handleEmailDelete = (index: number) => {
    setAccessEmails(accessEmails.filter((_, i) => i !== index));
  };

  const handleChangePermission = async () => {
    if (!pId) return;
    try {
      if (isPublic) {
        await updateDocumentPermission(pId, [""], true);
      } else {
        await updateDocumentPermission(pId, accessEmails, false);
      }
      setHandleOpenOptionModal(false);
    } catch (error) {
      console.log('permission update failed', error);
    }
  };

  const handleCreateFile = (filePath: string) => {
    ws.send(JSON.stringify({ type: "file:create", data: { filePath: `user/${pId}${filePath}/new-file` } }));
    setNewFileCreatedPath(`${filePath}/new-file`)
  }

  const handleCreateFolder = (filePath: string) => {
    ws.send(JSON.stringify({ type: "folder:create", data: { filePath: `user/${pId}${filePath}/new-folder` } }));
    setNewFolderCreatedPath(`${filePath}/new-folder`)
  }

  const handleDeleteFile = (filePath: string) => {
    ws.send(
      JSON.stringify({
        type: "file:delete",
        data: { filePath: `user/${pId}${filePath}` },
      })
    );
  };

  const handleDeleteFolder = (filePath: string) => {
    ws.send(
      JSON.stringify({
        type: "folder:delete",
        data: { filePath: `user/${pId}${filePath}` },
      })
    );
  };

  const handleRename = (path: any) => {
    let dupPath = path;
    let newPath = dupPath.replace(fileName, newFileName);
    console.log(`user/${pId}${path}`);
    console.log(`user/${pId}${newPath}`);
    if (pId) {
      ws.send(
        JSON.stringify({
          type: "file:rename",
          data: {
            oldPath: `user/${pId}${path}`,
            newPath: `user/${pId}${newPath}`,
          },
        })
      );
    }
    setIsRenaming(false);

  };

  const handleFolderRename = (path: any) => {
    let dupPath = path;
    let newPath = dupPath.replace(fileName, newFolderName);
    console.log(`user/${pId}${path}`);
    console.log(`user/${pId}${newPath}`);
    if (pId) {
      ws.send(
        JSON.stringify({
          type: "file:rename",
          data: {
            oldPath: `user/${pId}${path}`,
            newPath: `user/${pId}${newPath}`,
          },
        })
      );
    }
    setIsFolderRenaming(false);
  };

  const handleClick = () => {
    setMenuStyle({ display: "none" });
    setFolderMenuStyle({ display: "none" });
  };

  useEffect(() => {
    if (path === newFolderCreatedPath) {
      handleFolderMenuClick('rename', newFolderCreatedPath)
    }
  }, [newFolderCreatedPath])

  useEffect(() => {
    if (path === newFileCreatedPath) {
      handleMenuClick('rename', newFileCreatedPath)
    }
  }, [newFileCreatedPath])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !(event.target instanceof Node && menuRef.current.contains(event.target))) {
        setMenuStyle({ display: "none" });
      }
      if (folderMenuRef.current && !(event.target instanceof Node && folderMenuRef.current.contains(event.target))) {
        setFolderMenuStyle({ display: "none" });
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  return (
    <div
      className={`bg-${bgcolor}`}
      style={{ marginLeft: "17px", position: "relative" }}
      onClick={handleClick}
    >
      {isFolder && fileName != "node_modules" ? (
        <div style={{ borderLeft: isDarkMode ? "0.1px solid #7e7e7e" : "0.1px solid #7e7e7e" }}>
          {isFolderRenaming ? (
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onBlur={() => handleFolderRename(path)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleFolderRename(path);
                }
              }}
              className={`bg-white-1 text-black-1`}
              autoFocus
            />
          ) : (
            <span
              className={`hover:text-blue font-thin text-small-regular ${isDarkMode ?'text-white-1': 'text-black-1' }`}
              onClick={toggleExpansion}
              style={{ cursor: 'pointer' }}
              onContextMenu={(e) => handleFolderRightClick(e, path)}
            >
              <span className="pr-2" style={{ fontSize: '10px' }}>
                {isExpanded ? '▼ 📂' : '▶ 📁'}
              </span>
              {newFolderName}
            </span>

          )
          }
          {isExpanded && (
            <ul style={{ listStyleType: "none" }}>
              {childNodeEntries.map(([child, childNodes]) => (
                <li key={child} style={{ lineHeight: "20px" }}>
                  <FileTreeNode
                    fileName={child}
                    nodes={childNodes}
                    onSelect={onSelect}
                    path={`${path}/${child}`}
                    searchSelectedPath={searchSelectedPath}
                    setSearchResult={setSearchResult}
                    searchResult={searchResult}
                    pId={pId}
                    newFolderCreatedPath={newFolderCreatedPath}
                    setNewFolderCreatedPath={setNewFolderCreatedPath}
                    newFileCreatedPath={newFileCreatedPath}
                    setNewFileCreatedPath={setNewFileCreatedPath}
                    isDarkMode={isDarkMode}
                    bgcolor={bgcolor}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          {fileName !== "node_modules" ? (
            <div className="">
              {isRenaming ? (
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onBlur={() => handleRename(path)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleRename(path);
                    }
                  }}
                  className={`bg-white-1 text-black-1`}
                  autoFocus
                />
              ) : (
                <span
                  className="cursor-pointer font-thin text-small-regular hover:text-blue"
                  onClick={() => onSelect(path)}
                  onContextMenu={(e) => handleRightClick(e, path)}
                >
                  <span className="pr-2" style={{ width: '15px', height: '15px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* 📄 {/*path crop image from object  */}
                    <i className={iconMapping[fileName.split(".").pop() as string]}></i>
                  </span>
                  {newFileName}
                </span>
              )}
            </div>
          ) : (
            ""
          )}
        </>
      )}

  <div ref={menuRef}className={`border-black-3 shadow-2xl px-1 py-1 rounded-md right-clicks-modals w-52 bg-${bgcolor} ${isDarkMode?"text-white-3":"text-black-1"}`} style={{...menuStyle,position: "fixed",border: "1px solid black",zIndex: 1000, color:"whitesmoke"}}>
    <div className="text-small-regular cursor-pointer px-2 py-1/2 hover:bg-orange-1 hover:text-white-1 mb-1 rounded-sm"style={{ cursor: "pointer", fontSize: "13px" }}onClick={() => handleMenuClick("manage-access", path)}>Manage Access</div>
    <div className="text-small-regular cursor-pointer px-2 py-1/2 hover:bg-orange-1 hover:text-white-1 mb-1 rounded-sm"style={{ cursor: "pointer", fontSize: "13px" }}onClick={() => handleMenuClick("rename", path)}>Rename</div>
    <div className="text-small-regular cursor-pointer px-2 py-1/2 hover:bg-orange-1 hover:text-white-1 mb-1 rounded-sm"style={{ cursor: "pointer", fontSize: "13px" }}onClick={() => handleMenuClick("delete", path)}>Delete</div>
  </div>

  <div ref={folderMenuRef}className={`border-black-3 shadow-2xl px-1 py-1 rounded-md right-clicks-modals w-52 bg-${bgcolor} ${isDarkMode?"text-white-3":"text-black-1"}`}style={{...folderMenuStyle,position: "fixed",border: "1px solid black",zIndex: 1000, color:"whitesmoke"}}>
    {/* <div className="text-small-regular cursor-pointer px-2 py-1/2 hover:bg-orange-1 hover:text-white-1 mb-1 rounded-sm"style={{ cursor: "pointer", fontSize: "13px" }}onClick={() => handleFolderMenuClick("manage-access", path)}>Manage Access</div> */}
    <div className="text-small-regular cursor-pointer px-2 py-1/2 hover:bg-orange-1 hover:text-white-1 mb-1 rounded-sm"style={{ cursor: "pointer", fontSize: "13px" }}onClick={() => handleFolderMenuClick("create-folder", path)}>New Folder...</div>
    <div className="text-small-regular cursor-pointer px-2 py-1/2 hover:bg-orange-1 hover:text-white-1 mb-1 rounded-sm"style={{ cursor: "pointer", fontSize: "13px" }}onClick={() => handleFolderMenuClick("create-file", path)}>New File...</div>
    <div className="text-small-regular cursor-pointer px-2 py-1/2 hover:bg-orange-1 hover:text-white-1 mb-1 rounded-sm"style={{ cursor: "pointer", fontSize: "13px" }}onClick={() => handleFolderMenuClick("rename", path)}>Rename</div>
    <div className="text-small-regular cursor-pointer px-2 py-1/2 hover:bg-orange-1 hover:text-white-1 mb-1 rounded-sm"style={{ cursor: "pointer", fontSize: "13px" }}onClick={() => handleFolderMenuClick("delete", path)}>Delete</div>
  </div>

  {handleOpenOptionModal && (
    <div className={`absolute top-1/3 left-[60%] z-10 flex flex-col justify-center items-center gap-2 ${isDarkMode ? "bg-dark-1 text-white-2" : "bg-white-1 text-black-1"} p-3 shadow-xl rounded-lg w-[30rem]`}>
      <div className="">Add Emails To Whom You want to give access</div>
      <div className="relative w-full">
        <Input type='email' placeholder='example@example.com' value={input} onChange={(e) => setInput(e.target.value)} className={isDarkMode ? 'bg-black-3' : 'bg-white-2'} />
        <div className="absolute top-0 right-0 bg-white-1 p-2 text-black-1 rounded-r-lg px-4 cursor-pointer" onClick={handleAddEmail}>+</div>
      </div>
      {accessEmails.map((email: string, index: number) => (
        <p key={index} className='mt-1 text-left grid grid-cols-2 items-center justify-between w-full'>
          {email}
          <span className="flex w-full justify-end cursor-pointer" onClick={() => handleEmailDelete(index)}>Delete</span>
        </p>
      ))}

      <div className="flex w-full justify-between items-center my-5">
        <Label>Give Public Access</Label>
        <input type='checkbox' onChange={() => setIsPublic(!isPublic)} checked={isPublic} className='p-3' />
      </div>

      <div className="mt-4 flex w-full justify-end gap-2">
        <div className="bg-dark-3 p-3 cursor-pointer rounded-lg hover:bg-dark-2 text-white-1" onClick={() => setHandleOpenOptionModal(false)}>
          Cancel
        </div>
        <div className="bg-dark-3 p-3 cursor-pointer rounded-lg hover:bg-dark-2 text-white-1" onClick={handleChangePermission}>
          Confirm Access
        </div>
      </div>
    </div>
  )}

</div>
  );
};

const FileStructureTree = ({
  onSelect,
  pId,
  searchSelectedPath,
  setSearchResult,
  searchResult,
  docName,
  isDarkMode,
  bgcolor,
}: any) => {
  const [tree, setTree] = useState<any>(null);
  const [newFolderCreatedPath, setNewFolderCreatedPath] = useState<any>(null)
  const [newFileCreatedPath, setNewFileCreatedPath] = useState<any>(null)
  const treeData = tree?.tree;
  const fallbackTree = treeData && typeof treeData === "object" ? treeData : null;
  const projectTree =
    (pId !== null && pId !== undefined && treeData?.[pId]) ||
    (pId !== null && pId !== undefined && treeData?.[String(pId)]) ||
    (treeData && typeof treeData === "object" && Object.keys(treeData).length === 1
      ? Object.values(treeData)[0]
      : fallbackTree);

  useEffect(() => {
    async function fetchFileTree() {
      try {
        const response = await fetch(`${BACKEND_HTTP_URL}/files`);
        if (!response.ok) {
          throw new Error(`Failed to fetch tree: ${response.status}`);
        }
        const fileTree = await response.json();
        setTree(fileTree);
      } catch (err) {
        console.log("error in fetching in the recently changed file", err);
        setTree(null);
      }
    }
    fetchFileTree();

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "file:refresh") {
        fetchFileTree();
      }
    };
  }, []);

  return (
    <div>
      {projectTree && (
        <FileTreeNode
          fileName={docName}
          nodes={projectTree}
          onSelect={onSelect}
          path={""}
          searchSelectedPath={searchSelectedPath}
          setSearchResult={setSearchResult}
          searchResult={searchResult}
          pId={pId}
          newFolderCreatedPath={newFolderCreatedPath}
          setNewFolderCreatedPath={setNewFolderCreatedPath}
          newFileCreatedPath={newFileCreatedPath}
          setNewFileCreatedPath={setNewFileCreatedPath}
          isDarkMode={isDarkMode}
          bgcolor={bgcolor}
        />
      )}
    </div>
  );
};

export default FileStructureTree;
