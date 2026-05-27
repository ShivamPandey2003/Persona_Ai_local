import { Logo } from "@/assets";

const Navbar = () => {
  return (
    <header
      className={
        "sticky top-0 z-50 bg-background/60 backdrop-blur border-b border-gray-200"
      }
    >
      <div className={"flex justify-between items-center mx-4 md:mx-10"}>
        <div className="flex h-12 shrink-0 items-center gap-2">
          <div className="">
            <Logo size={45} />
            <span className="sr-only">Persona AI.</span>
          </div>
          <h3 className="font-semibold text-lg">Persona AI</h3>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
