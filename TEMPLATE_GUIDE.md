# KioskIQ - 3D Planning Visualization Template

This is a clean template for building **planning visualization and 3D analysis applications** using the multi-agent architecture pattern (ADK + A2A Protocol).

## What Was Removed

All banking and transaction management code has been removed to create a focused template:

### ✂️ Removed Components & Features:
- **Banking Tab View** - The "🏦 Banking" segmented control and its entire view
- **Transaction Management** - Forms, modals, and transaction list display
- **Banking Metrics** - Balance, income, expense calculations
- **Banking API Integrations**:
  - `/api/transactions` route
  - Transaction CRUD operations
  - Budget modal functionality
- **Banking-Related States**:
  - `activeTab` (was toggling between 'banking' | 'planning')
  - `transactionData` state
  - `bankingMetrics` computed values
  - `showAddModal`, `showBudgetModal` states
  - `newTxn` form state
  - Transaction event handlers

### Components Cleaned:
- `TransactionList.tsx` - No longer imported or used
- `TransactionForm.tsx` - Removed from travel-chat
- `SetBudgetModal.tsx` - No longer imported or used
- `travel-chat.tsx` - Removed transaction extraction logic and form action

## What Remains - The Planning Template

### Core Structure:
```
┌─────────────────────────────────────────────────────┐
│  Financial Planning Dashboard                       │
├──────────────────┬──────────────────────────────────┤
│   Chat Panel     │   3D Visualization Panel         │
│   (Left 450px)   │   (Flexible Right Panel)         │
│                  │                                   │
│ - Multi-agent    │ - Financial Plan Cards           │
│   orchestrator   │ - Master Plan Timeline           │
│ - Real-time      │ - Feasibility Analysis           │
│   data sync      │ - Investment Strategies          │
│ - A2A Protocol   │ - Planning Insights              │
└──────────────────┴──────────────────────────────────┘
```

### Available Planning Components:
1. **FinancialPlanCard** - Monthly budget breakdown and advice
2. **MasterPlanCard** - Long-term savings milestones timeline
3. **SummaryPlanCard** - Dashboard summary and messaging
4. **FeasibilityCard** - Goal feasibility analysis
5. **InvestmentCard** - Investment strategy allocation
6. **DownloadReportButton** - Export planning reports

### Data Flow:
```
User Input (Chat Panel)
    ↓
Orchestrator Agent (Multi-Agent Coordination)
    ↓
Specialist Agents (Financial, Investment, etc.)
    ↓
Structured JSON Response
    ↓
Auto-Extraction & State Sync
    ↓
Render 3D Visualization (Right Panel)
```

## Extending the Template

### Adding New Planning Visualization:

1. **Define Data Type** in `components/types/index.ts`:
```typescript
export interface NewPlanData {
  title: string;
  metric1: number;
  metric2: string;
  // ... add your fields
}
```

2. **Create Visualization Component** (`components/NewPlanCard.tsx`):
```typescript
export const NewPlanCard = ({ data }: { data: NewPlanData }) => {
  return (
    <div className="bg-white/80 rounded-xl p-4 border-2 border-blue-200">
      <h3 className="font-bold">{data.title}</h3>
      {/* Your 3D visualization or charts here */}
    </div>
  );
};
```

3. **Register in Travel Chat** (`components/travel-chat.tsx`):
   - Add extraction logic in the `useEffect` that parses agent responses
   - Add handler to call `onNewPlanUpdate?.(parsedData)`

4. **Add to Home Component** (`app/page.tsx`):
   - Add state: `const [newPlanData, setNewPlanData] = useState<NewPlanData | null>(null)`
   - Pass to TravelChat: `onNewPlanUpdate={setNewPlanData}`
   - Render: `{newPlanData && <NewPlanCard data={newPlanData} />}`

### Customizing the Layout:

- **Left Panel Width**: Change `w-[450px]` in the main container (line in page.tsx)
- **Background Colors**: Modify the blur blobs or backdrop classes
- **Typography**: Update heading styles in the header section
- **Grid Layout**: Adjust responsive classes (e.g., `grid-cols-1 md:grid-cols-2`)

### Adding Agents:

Refer to `changeAgent.md` for the complete guide on:
- Creating new agent backends (Python with ADK)
- Registering agents in A2A middleware
- Integrating agent outputs with the UI

## File Structure

```
KioskIQ/
├── app/
│   ├── page.tsx                 # Main page (Planning UI only)
│   ├── layout.tsx               # Root layout
│   ├── globals.css              # Styles
│   └── api/                      # Backend APIs
│       └── copilotkit/route.ts   # A2A middleware
├── components/
│   ├── travel-chat.tsx          # Chat interface & data extraction
│   ├── *Card.tsx                # Planning visualization components
│   ├── types/index.ts           # All TypeScript interfaces
│   ├── forms/                   # HITL forms (planning focused)
│   ├── a2a/                     # A2A communication display
│   └── theme-provider.tsx       # Theme config
├── agents/                      # Python agent implementations
│   ├── orchestrator.py          # Main coordinator
│   ├── financial_planner_agent.py
│   ├── feasibility_agent.py
│   ├── investment_agent.py
│   └── ...
├── package.json                 # npm scripts
└── TEMPLATE_GUIDE.md           # This file
```

## Key Differences from Original

| Aspect | Before | After |
|--------|--------|-------|
| **Main Purpose** | Financial Banking + Planning | Planning & Visualization |
| **UI Layout** | Tab-based (Banking/Planning) | Planning-only |
| **Data Focus** | Transactions, Balance, Expenses | Financial Plans, Feasibility, Investments |
| **API Routes** | Transaction CRUD routes | Planning/Analysis routes only |
| **Components** | 15+ (including banking) | 10+ (planning focused) |
| **Database** | Transaction storage | Planning data only |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start agents (in separate terminals)
npm run dev:orchestrator
npm run dev:financial
npm run dev:feasibility
npm run dev:investment

# 3. Start the Next.js frontend
npm run dev

# 4. Open browser
# http://localhost:3000
```

## Usage Example

1. **Type in Chat**: "Help me plan to save $5000 in 12 months with $3000 monthly income"
2. **What Happens**:
   - Chat sent to Orchestrator Agent
   - Orchestrator routes to Financial Planner + Feasibility + Investment agents
   - Agents return structured JSON
   - Travel Chat extracts data
   - Components auto-render in right panel
3. **Result**: Visual plan appears with timeline, feasibility analysis, and investment recommendations

## Notes

- This template removes all banking features and transaction management
- The chat still works with the same multi-agent orchestration
- You can add new planning visualizations without touching banking code
- All agent logic is preserved; only UI was simplified
- Use as a starting point for building other planning/visualization apps

## Support

Refer to:
- `changeAgent.md` - How to add new agents
- Backend agent files - How agents work internally
- `components/types/index.ts` - Data structure reference
