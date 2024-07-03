import FileOperationBar from "@/components/shared/fileOperationsBar";
import Image from "next/image";
import MobileFileOperationBar from "@/components/shared/mobileFileOperationBar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative flex flex-col">
      <main className="relative flex bg-black-3">
        <FileOperationBar />
        
        <section className="flex min-h-screen flex-1 flex-col">
          <div className="mx-auto flex w-full flex-col">
            <div className="flex h-16 items-center justify-between md:hidden">
              <Image 
                src="/icons/logo.png"
                width={30}
                height={30}
                alt="menu icon"
              />
              <MobileFileOperationBar />
            </div>
            <div className="flex flex-col md:pb-14">
              {children}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}