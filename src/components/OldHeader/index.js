import React, { useState } from "react";
import { Link } from "react-router-dom";
import cn from "classnames";
import styles from "./Header.module.sass";
import Image from "../Image";
import User from "./User";
import Dropdown from "./Dropdown";

const nav = [
  {
    url: "/activity",
    title: "Activity",
  },
];

const Headers = ({ home }) => {
  const [visibleNav, setVisibleNav] = useState(false);

  return (
    <header className={styles.header}>
      <div className={cn("container", styles.container)}>
        <Link className={styles.logo} to="/">
          <Image
            className={styles.pic}
            src="/assets/logo.png"
            srcDark="/assets/logo.png"
            alt="Fitness Pro"
          />
          <div className={styles.separator}></div>
        </Link>
        {home ? (
          <div
            className={cn(styles.wrapper, {
              [styles.active]: visibleNav,
            })}
          >
            <nav className={styles.nav}>
              <Dropdown
                className={styles.typeCoins}
                value="Shop"
                options={[
                  { link: "/buy", title: "Buy" },
                  { link: "/sell", title: "Sell" },
                  { link: "/swap", title: "Swap" },
                ]}
              />
              <Dropdown
                className={styles.typeCoins}
                value="Stake"
                options={[
                  {
                    link: "/stake-coins",
                    title: "Stake Coins",
                  },
                  {
                    link: "/stake-nfts",
                    title: "Stake Nfts",
                  },
                ]}
              />
              <Dropdown
                className={styles.typeCoins}
                value="Coins"
                options={[
                  {
                    link: "/coins",
                    title: "Coins Liquidity",
                  },
                  { link: "/buy-coins", title: "Buy Coins" },
                ]}
              />
              {nav.map((x, index) => (
                <Link className={styles.link} to={x.url} key={index}>
                  {x.title}
                </Link>
              ))}
              <User className={styles.user} />
            </nav>
          </div>
        ) : (
          <div></div>
        )}
        {/* <Link
          className={cn("button-stroke button-small", styles.button)}
          to="/connect-wallet"
        >
          Connect Wallet
        </Link> */}
        {home && (
          <button
            className={cn(styles.burger, {
              [styles.active]: visibleNav,
            })}
            onClick={() => setVisibleNav(!visibleNav)}
          ></button>
        )}
      </div>
    </header>
  );
};

export default Headers;
