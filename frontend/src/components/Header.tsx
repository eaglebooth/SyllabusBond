"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {ExternalLink,RefreshCw} from "lucide-react";
import {useWallet} from "@/lib/wallet";

type Props={account?:string;onConnectWallet?:()=>void;onRefresh?:()=>void;isRefreshing?:boolean};
const EXPLORER_URL="https://explorer-studio.genlayer.com/address/0xd6763425A77c718b792C1F4C1E8c115efF66Bb2f";

export const Header=({account="",onConnectWallet,onRefresh,isRefreshing=false}:Props)=>{
 const {connect,isConnecting}=useWallet();
 const pathname=usePathname();const short=(a:string)=>a?`${a.slice(0,6)}…${a.slice(-4)}`:"Connect wallet";
 const links=[{name:"Offerings",href:"/offerings"},{name:"Workspace",href:"/workspace"},{name:"Verify",href:"/verify"}];
 // Pages own their connected-address state. Calling both context.connect() and the
 // page callback requested eth_requestAccounts twice, which could make wallet UX
 // appear stalled or trigger two extension prompts. Use exactly one path.
 const handleConnect=async()=>{
  if(typeof window==="undefined"||!window.ethereum){await connect();return;}
  if(onConnectWallet){await onConnectWallet();return;}
  await connect();
 };
 return <header className="floating-nav"><Link href="/" className="brand-mark"><span className="brand-glyph">S</span><span>SyllabusBond</span></Link><nav className="nav-links">{links.map(l=><Link key={l.href} href={l.href} className={`nav-link ${pathname===l.href?"nav-link-active":""}`}>{l.name}</Link>)}</nav><div className="nav-actions"><span className="network-chip"><i className="network-dot"/>Studionet</span>{onRefresh&&<button onClick={onRefresh} disabled={isRefreshing} className="btn-secondary nav-utility !min-h-10 !px-3" title="Sync on-chain state"><RefreshCw size={15} className={isRefreshing?"animate-spin":""}/></button>}<a href={EXPLORER_URL} target="_blank" rel="noreferrer" className="btn-secondary nav-utility !min-h-10 !px-3" title="Open deployed contract in Studio Explorer" aria-label="Open deployed contract in Studio Explorer"><ExternalLink size={16}/></a><button onClick={handleConnect} disabled={isConnecting} className="btn-academic !min-h-10 !px-4 font-mono text-xs">{isConnecting?"Connecting…":short(account)}</button></div></header>;
};
