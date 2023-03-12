import { useState } from "react";
import { Link } from "react-router-dom";
import cn from "classnames";
import styles from "./Header.module.sass";
import Image from "../Image"; /* 
import User from "./User"; */
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const Headers = () => {
  const [visibleNav, setVisibleNav] = useState(false);

  return (
    <header className={styles.header}>
      {/* <video playsInline autoPlay muted loop poster={stillBg}>
        <source src={headerBg} type="video/mp4" />
        Your browser does not support the video tag.
      </video> */}
      <div className={cn(styles.container)}>
        <Link className={styles.logo} to="/">
          <Image
            className={styles.pic}
            src="/assets/logo.png"
            srcDark="/assets/logo.png"
            alt="SOL LOGO"
          />
        </Link>
        <div className={cn(styles.wrapper, styles.visibleNav)}>
          <nav className={styles.nav}>
            <ul className={styles.headerul}>
              <li className={styles.headerli}>
                <a className={styles.link} href="https://flwrstaking.solflowers.io/">STAKE FLWR</a>
              </li>
              <li className={styles.headerli}>
                <Link to={"/create-raffle"} className={styles.link} >Create Raffle</Link>
              </li>
              <li className={styles.headerli}>
                <Link to={"/raffles"} className={styles.link} >Raffle</Link>
              </li>
              <li className={styles.headerli} style={{ marginRight: 20 }}>
                <Link to={"/aution"} className={styles.link} >Aution</Link>
              </li>
              <li className={styles.headerli}>
                <WalletModalProvider>
                  <WalletMultiButton />
                </WalletModalProvider>
              </li>
            </ul>
          </nav>
        </div>

        <button
          className={cn(styles.burger, { [styles.active]: visibleNav })}
          onClick={() => setVisibleNav(!visibleNav)}
        ></button>
      </div>
    </header>
  );
};

export default Headers;
