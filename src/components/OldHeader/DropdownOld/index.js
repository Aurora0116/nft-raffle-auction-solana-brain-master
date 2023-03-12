import React,  { useState, useEffect } from 'react'
import { Link } from 'react-router-dom';
import cn from "classnames";
import styles from "./Dropdown.module.sass";


const Dropdown = () => {
  const data = [{id: 0, label: "Buy", to: '/buy'}, {id: 1, label: "Sell", to: '/sell'}, {id: 2, label: "Swap", to: '/swap'},];

  const [isOpen, setOpen] = useState(false);
  const [items, setItem] = useState(data);
  const [selectedItem, setSelectedItem] = useState(null);
  
  const toggleDropdown = () => setOpen(!isOpen);
  
  return (
    <div className={styles.dropdown}>
            <div className={styles.dropdownHeader} onClick={toggleDropdown}>
  
                <h2>
                  Shop
                </h2>
            </div>
      <div className={cn(styles.dropdownBody, isOpen ? styles.open : null)} onClick={toggleDropdown} >
        {items.map(item => (
          <Link key={`Dropdown ${item.id}`} to={item.to} className={cn(styles.dropdownItem, styles.link)}>
            <h2 className={cn(styles.link)}>
              {item.label}
            </h2>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default Dropdown