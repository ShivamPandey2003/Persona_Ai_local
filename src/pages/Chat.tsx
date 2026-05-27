import { AppSidebar } from "@/components/common/Chat/app-sidebar";
import ConversationPromptInput from "@/components/common/Chat/ConversationPromptInput";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const ChatPage = () => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-10"
            />
            <div>
              <h3>Trust-Led Families</h3>
              <p className="text-xs">Brand-Loyal Household Consumers</p>
            </div>
          </div>
        </header>
        <ConversationPromptInput/>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default ChatPage;
