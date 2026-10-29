import { Header } from "../components/Header.tsx";
import { buttonVariants } from "../components/Button.tsx";
import Preview from "../islands/Preview.tsx";
import { define } from "../utils.ts";
import { PageProps } from "fresh";

export default define.page((props: PageProps) => {
 const inviteLink = Deno.env.get("INVITE_LINK");
 const shareBot = Deno.env.get("SHARE_BOT") === "true" && !!inviteLink;
 return (
  <>
   <section className="relative grid w-full grid-cols-1 gap-x-4 overflow-hidden border-x border-b border-neutral-800 p-6 lg:grid-cols-2 lg:p-12">
    <div className="flex flex-col items-start justify-center lg:col-span-1">
     <Header id="main">Discord Activity</Header>
     <p className="mt-2 text-lg text-neutral-400">API for displaying Discord activity data in JSON or SVG</p>
     <div className="mt-4 flex flex-wrap items-center gap-4">
      <a href="/docs" className={buttonVariants({ variant: "primary" })}>
       Documentation
      </a>
      {shareBot && (
       <a href={inviteLink} className={buttonVariants({ variant: "secondary" })} target="_blank" rel="noopener noreferrer">
        Join Discord
       </a>
      )}
     </div>
     {!shareBot && (
      <p className="mt-4 text-sm text-neutral-400">
       Interested in using this project? <a href="https://github.com/igorkowalczyk/discord-activity#-self-hosting" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">Host your own instance</a> with your own Discord bot and server.
      </p>
     )}
    </div>
    <div className="lg:flex lg:items-center lg:justify-end lg:col-span-1 hidden">
     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="aspect-square rounded-full size-52 stroke-white ">
      <path d="M18.2 12.27 20 6H4l1.8 6.27a1 1 0 0 0 .95.73h10.5a1 1 0 0 0 .96-.73Z" />
      <path d="M8 13v9" />
      <path d="M16 22v-9" />
      <path d="m9 6 1 7" />
      <path d="m15 6-1 7" />
      <path d="M12 6V2" />
      <path d="M13 2h-2" />
     </svg>
    </div>
   </section>
   <section className="border-x border-b border-neutral-800" id="preview">
    <Preview defaultUrl={props.url.origin} />
   </section>
  </>
 );
});
