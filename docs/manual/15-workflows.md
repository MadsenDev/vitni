# Typical Workflows

## Starting a New Investigation from a List of Names

1. Open a new project.
2. From the Command Palette, add a **Person** node for each subject.
3. Fill in known properties (name, phone, email) in the creation form. Each value creates an assertion.
4. Add a source for the information (e.g. "Tip sheet — 2025-01-10"). Attach the file if you have it.
5. Switch to **Investigation** and run **Layout: Readable map** to organise the canvas.
6. Begin adding relationships as connections become apparent.

## Enriching a Domain or IP Address

1. Add a **Domain** node with the domain name.
2. Open the Inspector. Under **Transforms**, run **WHOIS Lookup**. Accept the consent prompt.
3. Vitni creates assertions for registrar, dates, and nameservers, and may create a linked Organization node for the registrant.
4. If you want DNS data too, run **DNS Lookup** on the same node.
5. Review the new assertions in the Inspector. Set confidence to Verified for records confirmed from a primary source.

## Processing Evidence Before Writing a Report

1. Switch to **Review** workspace.
2. Work through the **Needs review** queue top to bottom.
3. For each assertion: read the value, check the source, decide — Accept / Dispute / Reject.
4. Use the **Dispute** state for anything you want to revisit rather than decide immediately.
5. After clearing the queue, switch back to **Investigation** and look for nodes still showing the *Needs review* indicator. These have assertions added since your last review pass.
6. When all critical nodes are clear, open **Export Report → Full Report** to generate the case document.

## Tracking Financial Flows

1. Add **Financial Account** nodes for each account involved.
2. Add **Financial Transaction** nodes for each transfer.
3. Connect accounts to people using *owns* (Ownership / Control).
4. Connect transactions to accounts using *financially linked → transferred to / received from*.
5. Set dates on transactions.
6. Switch to **Timeline** to verify the sequence of transfers makes sense.
7. Use **Layout: Chain / flow** in Investigation to visualise the direction of money movement.

## Finding Gaps Before Filing

1. Open the **AI** tab in the left sidebar.
2. Review **Leads** — address any orphaned nodes or entities missing required fields.
3. Review **Duplicate Watch** — investigate any flagged potential duplicates and merge or dismiss.
4. Switch to **Review** and filter to *Weakly supported* assertions. Decide whether each needs stronger sourcing before the case can be finalised.
5. Check nodes that still show the *Needs review* or *Conflict* indicator and resolve them.

## Saving a Working State Mid-Investigation

1. Arrange the canvas to the view most useful for your next session.
2. Click **View → Save view** in the toolbar. Name it meaningfully (e.g. "Financial network — Jan session").
3. When you reopen the project, restore this view from the View dropdown to return to exactly where you left off.
