"use client";

import { useUser } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { fetchUser } from "@/lib/actions/user.action";
import { fetchProject, updateDocumentTitleDescription } from "@/lib/actions/document.action";
import Terminal from "@/components/forms/terminal";
import FileStructureTree from "@/components/cards/fileStructureTree";
import CodeEditor from "@/components/forms/codeEditor";
import { useCallback, useEffect, useState } from "react";
import { Replace } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";

const ws = new WebSocket(
  process.env.NEXT_PUBLIC_SOCKET_BACKEND_URL || "ws://localhost:5001"
);

const themes = [
  'monokai', 'mode-javascript', 'github', 'ext-language_tools',
  'ambiance', 'cloud9_night', 'chaos', 'chrome',
  'cloud9_day', 'cloud9_night_low_color', 'cloud_editor',
  'cloud_editor_dark', 'clouds', 'clouds_midnight',
  'cobalt', 'crimson_editor', 'dawn', 'dracula',
  'dreamweaver', 'eclipse', 'github_dark',
  'github_light_default', 'gob', 'gruvbox',
  'gruvbox_dark_hard', 'gruvbox_light_hard', 'idle_fingers',
  'iplastic', 'katzenmilch', 'kr_theme', 'kuroir',
  'merbivore', 'merbivore_soft', 'mono_industrial',
  'nord_dark', 'one_dark', 'pastel_on_dark',
  'solarized_dark', 'solarized_light', 'sqlserver',
  'terminal', 'textmate', 'tomorrow', 'tomorrow_night',
  'tomorrow_night_blue', 'tomorrow_night_bright',
  'tomorrow_night_eighties', 'twilight', 'vibrant_ink',
  'xcode'
];

const Page = ({ params }: { params: { id: string } }) => {
  const { user } = useUser();
  const [selectedPath, setSeletedPath] = useState<string>("");
  const [searchSelectedPath, setSearchSeletedPath] = useState<string>(selectedPath);
  const [project, setProject] = useState<any>(null);
  const [searchResult, setSearchResult] = useState<any>([]);
  const [docName, setDocName] = useState<string>("");
  const [docDesc, setDocDesc] = useState<string>("");
  const [showSetting, setShowSetting] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>('');

  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTheme(event.target.value);
  };

  useEffect(() => {
    const fetchData = async () => {
      const userInfo = await fetchUser(user?.id || "");
      const cProject = await fetchProject(params.id, userInfo?._id);
      setProject(cProject.id);
      setDocName(cProject.title);
      setDocDesc(cProject.desc);
    };
    fetchData();
  }, [params.id]);

  useEffect(() => {
    if (project) {
      ws.send(JSON.stringify({ type: "project:started", data: { id: project.id } }));
    }
  }, [project]);

  const handleTitleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setDocName(newTitle);
    if (project) {
      await updateDocumentTitleDescription(params.id, docName, docDesc);
    }
  };

  const handleDescChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDesc = e.target.value
    setDocDesc(newDesc);
    if (project) {
      await updateDocumentTitleDescription(params.id, docName, docDesc);
    }
  };

  return (
    <div className="custom-scrollbar w-screen">
      <header className="grid grid-cols-3 text-white-1 items-center py-1 px-5" style={{ borderBottom: "0.5px solid rgba(255, 255, 255, 0.4)" }}>
        <div className='flex cursor-pointer items-center gap-1 max-lg:justify-center'>
          <Link href="/"><Image src="/icons/logo.png" alt="Podcast Logo" width={30} height={30} /></Link>
          <div className="text-white-1 flex flex-col items-start justify-center w-full">
            <div className="flex gap-2 flex-grow-1">
              <input type='text' className='bg-transparent px-3' value={docName} onChange={handleTitleChange} />
              <Image src="/icons/heart.svg" width={16} height={16} alt='like' />
            </div>
            <input type='text' className='w-full bg-transparent px-3 text-small-regular text-white-2' value={docDesc} onChange={handleDescChange} />
          </div>
        </div>
        <div className="relative w-full bg-white-1">
          <div className="w-full absolute bg-black-2 top-[-0.8rem] z-10 rounded-lg" style={{ border: "0.5px solid rgba(255, 255, 255, 0.4)" }}>
            <div className="relative">
              <p className="absolute left-5">🔎</p>
              <input
                type="text"
                value={searchSelectedPath}
                placeholder={selectedPath}
                className="bg-black-2 rounded-lg text-center w-full"
                style={{ border: "0.5px solid rgba(255, 255, 255, 0.4)" }}
                onChange={(e) => setSearchSeletedPath(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSeletedPath(searchSelectedPath);
                  }
                }}
              />
            </div>
            {searchResult.length !== 0 && searchResult.map((res: string, index: number) => (
              <p
                key={index}
                className="text-white-1 cursor-pointer hover:bg-orange-1 rounded-b-lg px-5 py-1"
                onClick={() => {
                  setSeletedPath(res);
                  setSearchSeletedPath("");
                }}
              >
                {res}
              </p>
            ))}
          </div>
        </div>
        <div className="relative w-full flex justify-end items-center">
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSw7B6uZ6KGbEW1RqetJeXnUlPDFvEDLihjZw&s"
            alt="Settings"
            className="w-8 h-8 cursor-pointer"
            onClick={() => setShowSetting(!showSetting)}
          />
          {showSetting && (
            <div className="absolute right-0 top-10 bg-white border border-gray-300 shadow-lg p-4 rounded-md z-50">
              <h3 className="text-lg font-semibold mb-2">Manage Themes</h3>
              <select
                className="w-full bg-orange-1 border border-gray-300 rounded-md p-2"
                value={selectedTheme}
                onChange={handleThemeChange}
              >
                {themes.map(theme => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

      </header>
      <div className="main-container flex text-white-1">
        <div className="w-[290px] bg-black-3 h-[96vh] py-3 px-3 flex flex-col" style={{ borderRight: "0.5px solid rgba(255, 255, 255, 0.4)" }}>
          <Link href="/" className="flex cursor-pointer items-center gap-1 pb-5 max-lg:justify-center">
            <Image src="/icons/logo.png" alt="Podcast Logo" width={30} height={30} />
            <h1 className="text-24 font-extrabold text-white max-lg:hidden">CollabWriter</h1>
          </Link>
          <div className="overflow-y-scroll custom-scrollbar">
            <FileStructureTree
              onSelect={(path: string) => setSeletedPath(path)}
              pId={project}
              searchSelectedPath={searchSelectedPath}
              searchResult={searchResult}
              setSearchResult={setSearchResult}
            />
          </div>
        </div>
        <div className="code-container w-full flex flex-col justify-between h-[95vh]">
          <div className="editor h-full bg-black-1">
            {selectedPath && (
              <div className="h-full">
                <CodeEditor path={selectedPath} pId={project} selectedTheme={selectedTheme} />
              </div>
            )}
          </div>
          <Terminal />
        </div>
      </div>
    </div>
  );
};

export default Page;
