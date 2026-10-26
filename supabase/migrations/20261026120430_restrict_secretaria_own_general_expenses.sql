drop policy if exists "general_expenses read" on public.general_expenses;
drop policy if exists "general_expenses update" on public.general_expenses;
drop policy if exists "general_expenses delete" on public.general_expenses;
drop policy if exists "general_expenses insert" on public.general_expenses;

create policy "general_expenses read"
on public.general_expenses for select to authenticated
using (
  private.can_access_finance(auth.uid())
  or (
    coalesce(private.is_active(auth.uid()), false)
    and created_by = auth.uid()
    and truck_id is null
    and service_id is null
    and purchase_installment_id is null
    and stock_purchase_id is null
    and stock_movement_id is null
    and company_vehicle_id is null
    and warranty_id is null
    and inventory_item_id is null
    and employee_id is null
    and closing_id is null
    and closing_month is null
    and bank_account_id is null
    and closed_at is null
  )
);

create policy "general_expenses insert"
on public.general_expenses for insert to authenticated
with check (
  private.can_access_finance(auth.uid())
  or (
    coalesce(private.is_active(auth.uid()), false)
    and created_by = auth.uid()
    and truck_id is null
    and service_id is null
    and purchase_installment_id is null
    and stock_purchase_id is null
    and stock_movement_id is null
    and company_vehicle_id is null
    and warranty_id is null
    and inventory_item_id is null
    and employee_id is null
    and closing_id is null
    and closing_month is null
    and bank_account_id is null
    and closed_at is null
  )
);

create policy "general_expenses update"
on public.general_expenses for update to authenticated
using (
  private.can_access_finance(auth.uid())
  or (
    coalesce(private.is_active(auth.uid()), false)
    and created_by = auth.uid()
    and truck_id is null
    and service_id is null
    and purchase_installment_id is null
    and stock_purchase_id is null
    and stock_movement_id is null
    and company_vehicle_id is null
    and warranty_id is null
    and inventory_item_id is null
    and employee_id is null
    and closing_id is null
    and closing_month is null
    and bank_account_id is null
    and closed_at is null
  )
)
with check (
  private.can_access_finance(auth.uid())
  or (
    coalesce(private.is_active(auth.uid()), false)
    and created_by = auth.uid()
    and truck_id is null
    and service_id is null
    and purchase_installment_id is null
    and stock_purchase_id is null
    and stock_movement_id is null
    and company_vehicle_id is null
    and warranty_id is null
    and inventory_item_id is null
    and employee_id is null
    and closing_id is null
    and closing_month is null
    and bank_account_id is null
    and closed_at is null
  )
);

create policy "general_expenses delete"
on public.general_expenses for delete to authenticated
using (
  private.can_access_finance(auth.uid())
  or (
    coalesce(private.is_active(auth.uid()), false)
    and created_by = auth.uid()
    and truck_id is null
    and service_id is null
    and purchase_installment_id is null
    and stock_purchase_id is null
    and stock_movement_id is null
    and company_vehicle_id is null
    and warranty_id is null
    and inventory_item_id is null
    and employee_id is null
    and closing_id is null
    and closing_month is null
    and bank_account_id is null
    and closed_at is null
  )
);
