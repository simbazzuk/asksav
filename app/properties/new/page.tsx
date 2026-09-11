import AppShell from "../../../components/AppShell";
import NewPropertyClient from "./NewPropertyClient";

export default function NewPropertyPage() {
  return (
    <AppShell title="Properties">
      <div className="sf1263-add-property-page page-head">
        <div>
          <h1>Add property</h1>
          <p>Create a real property record before configuring its inspection areas.</p>
        </div>
      </div>

      <NewPropertyClient />
    </AppShell>
  );
}
