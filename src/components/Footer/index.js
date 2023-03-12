import React from "react";
import styles from "./Footer.module.sass";

const Footers = () => {
    return (
        <footer className={styles.footer}>
            <div className={styles.picContainer}>
                <img
                    className={styles.pic}
                    src="/assets/sol-agralabs.png"
                    alt="Sol Agralabs"
                />
            </div>
        </footer>
    );
};

export default Footers;
