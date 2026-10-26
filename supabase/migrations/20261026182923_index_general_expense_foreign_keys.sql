create index if not exists general_expenses_financial_event_kind_idx
on public.general_expenses(financial_event_kind);

create index if not exists general_expenses_stock_purchase_id_idx
on public.general_expenses(stock_purchase_id);
