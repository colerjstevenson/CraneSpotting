import Link from "next/link";
import Image from "next/image";
import { Camera, House, LogOut, Trophy } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { getCurrentPlayer } from "@/lib/auth";

const navigation = [
  { href: "/", label: "Home", icon: House },
  { href: "/leaderboard", label: "Global board", icon: Trophy },
  { href: "/submit", label: "Submit", icon: Camera, submit: true },
];

export async function AppHeader() {
  const player = await getCurrentPlayer();

  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Crane Spotting home">
        <span className="brand-mark"><Image src="/bird_crane.svg" alt="" width={26} height={26} /></span>
        <span className="brand-name">CRANE<small>SPOTTING</small></span>
      </Link>
      <div className="header-side">
        <span className="season-label">GLOBAL DIVISION / FIELD EDITION</span>
        <div className="account-control">
          {player ? (
            <>
              <span className="account-name">{player.displayName}</span>
              <form action={signOut}>
                <button className="account-button" type="submit" aria-label="Sign out">
                  <LogOut size={16} aria-hidden="true" />
                  <span>Sign out</span>
                </button>
              </form>
            </>
          ) : (
            <>
              <Link className="account-link" href="/login">Log in</Link>
              <Link className="account-link account-link--join" href="/signup">Join</Link>
            </>
          )}
        </div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navigation.map(({ href, label, icon: Icon, submit }) => (
            <Link key={href} className={`nav-link${submit ? " nav-link--submit" : ""}`} href={href}>
              <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}