import React from 'react';

export function NavigationMenu({ children, className = '', ...props }) {
  return <nav className={`navigation-menu ${className}`.trim()} {...props}>{children}</nav>;
}

export function NavigationMenuList({ children, className = '', ...props }) {
  return <ul className={`navigation-menu__list ${className}`.trim()} {...props}>{children}</ul>;
}

export function NavigationMenuItem({ children, className = '', ...props }) {
  return <li className={`navigation-menu__item ${className}`.trim()} {...props}>{children}</li>;
}

export function NavigationMenuTrigger({ children, className = '', ...props }) {
  return <button className={`navigation-menu__trigger ${className}`.trim()} type="button" {...props}>{children}<span aria-hidden="true">⌄</span></button>;
}

export function NavigationMenuContent({ children, className = '', ...props }) {
  return <div className={`navigation-menu__content ${className}`.trim()} {...props}>{children}</div>;
}

export function NavigationMenuLink({ children, className = '', active = false, ...props }) {
  return <a className={`navigation-menu__link ${active ? 'is-active' : ''} ${className}`.trim()} aria-current={active ? 'page' : undefined} {...props}>{children}</a>;
}
