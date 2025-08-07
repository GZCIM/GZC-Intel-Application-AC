import { NavLink } from "react-router-dom";
import { pageRegistry } from "../../../../pages/pageRegistry";

const PageSelector = () => {
  return (
    <nav className="flex space-x-6 border-b border-gzc-light-grey dark:border-gzc-dark-grey px-6 py-2 bg-gzc-white dark:bg-gzc-black">
      {Object.values(pageRegistry).map(({ path, name }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            `relative px-3 py-2 text-sm font-medium text-gzc-mid-black dark:text-gzc-light-grey hover:text-gzc-flash-green dark:hover:text-gzc-flash-green transition ${
              isActive
                ? "font-semibold text-gzc-flash-green dark:text-gzc-flash-green border-b-2 border-gzc-flash-green dark:border-gzc-flash-green"
                : ""
            }`
          }
        >
          {name}
        </NavLink>
      ))}
    </nav>
  );
};

export default PageSelector;
