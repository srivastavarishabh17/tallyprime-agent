<?php

namespace App\Http\Controllers\integration;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
// use Illuminate\Support\Facades\DB;

class IntegrationController extends Controller
{
    // ─── Auth ────────────────────────────────────────────────────────────────────

    private function authorize(Request $request): bool
    {
        $expected = config('services.tally.agent_token', 'satyakiran-agent-token-4325125');
        return $request->bearerToken() === $expected;
    }

    // ─── GET /api/tally/integration ──────────────────────────────────────────────

    public function getIntegration(Request $request)
    {
        return response()->json([
            'success'   => true,
            'message'   => 'Tally Integration API is running',
            'version'   => '1.0.0',
            'timestamp' => now()->toDateTimeString(),
        ]);
    }

    // ─── POST /api/tally/integration ─────────────────────────────────────────────

    public function postIntegration(Request $request)
    {
        if (!$this->authorize($request)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        try {
            Log::channel('tally')->info('TALLY REQUEST', [
                'ip'         => $request->ip(),
                'body'       => $request->except(['payload']),
                'created_at' => now()->toDateTimeString(),
            ]);

            $deviceId  = (string) $request->input('device_id', '');
            $companyId = (int)    $request->input('company_id', 0);
            $module    = (string) $request->input('module', '');
            $action    = (string) $request->input('action', '');
            $payload   = (array)  $request->input('payload', []);
            $records   = (array)  ($payload['data'] ?? []);

            // ── Pull actions (server → agent) ─────────────────────────────────
            if ($action === 'pull') {
                return $this->handlePull($module, $companyId, $deviceId);
            }

            // ── Push actions (agent → server) ─────────────────────────────────
            if ($action === 'push') {
                $this->handlePush($module, $companyId, $deviceId, $records);

                return response()->json([
                    'success'       => true,
                    'message'       => ucwords(str_replace('_', ' ', $module)) . ' synced.',
                    'device_id'     => $deviceId,
                    'company_id'    => $companyId,
                    'module'        => $module,
                    'action'        => $action,
                    'total_records' => count($records),
                ]);
            }

            Log::channel('tally')->warning('Unknown module/action', compact('module', 'action'));

            return response()->json(['success' => false, 'message' => 'Invalid module or action.'], 400);

        } catch (\Throwable $e) {
            Log::channel('tally')->error('Tally Integration Error', [
                'message' => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
            ]);

            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ─── Pull dispatcher (server → agent) ────────────────────────────────────────

    private function handlePull(string $module, int $companyId, string $deviceId)
    {
        switch ($module) {

            case 'sales':
                /*
                TODO: fetch from DB:
                $tasks = DB::table('tally_pending_sales')
                    ->where('company_id', $companyId)
                    ->where('synced', false)
                    ->get(['id','voucher_no','customer','amount'])
                    ->toArray();
                */
                $tasks = [
                    ['id' => 101, 'voucher_no' => 'INV-1001', 'customer' => 'ABC Traders',  'amount' => 15000],
                    ['id' => 102, 'voucher_no' => 'INV-1002', 'customer' => 'XYZ Traders',  'amount' => 25000],
                ];

                return response()->json(['success' => true, 'pending_tasks' => $tasks]);

            default:
                return response()->json(['success' => true, 'pending_tasks' => []]);
        }
    }

    // ─── Push dispatcher (agent → server) ────────────────────────────────────────

    private function handlePush(string $module, int $companyId, string $deviceId, array $records): void
    {
        Log::channel('tally')->info("PUSH [{$module}]", [
            'company_id' => $companyId,
            'device_id'  => $deviceId,
            'count'      => count($records),
        ]);

        match ($module) {
            'company'              => $this->pushCompany($companyId, $records),
            'ledgers'              => $this->pushLedgers($companyId, $records),
            'customer_masters'     => $this->pushLedgers($companyId, $records),
            'supplier_masters'     => $this->pushLedgers($companyId, $records),
            'bank_masters'         => $this->pushLedgers($companyId, $records),
            'customer_outstanding' => $this->pushLedgers($companyId, $records),
            'supplier_outstanding' => $this->pushLedgers($companyId, $records),
            'stock_groups'         => $this->pushStockGroups($companyId, $records),
            'stock_categories'     => $this->pushStockCategories($companyId, $records),
            'stock_items'          => $this->pushStockItems($companyId, $records),
            'stock_balances'       => $this->pushStockItems($companyId, $records),
            'units'                => $this->pushUnits($companyId, $records),
            'godowns'              => $this->pushGodowns($companyId, $records),
            'cost_centres'         => $this->pushCostCentres($companyId, $records),
            'cost_categories'      => $this->pushCostCategories($companyId, $records),
            'voucher_types'        => $this->pushVoucherTypes($companyId, $records),
            'batch_details'        => $this->pushBatchDetails($companyId, $records),
            'sales_vouchers'       => $this->pushVouchers($companyId, 'Sales', $records),
            'purchase_vouchers'    => $this->pushVouchers($companyId, 'Purchase', $records),
            'payment_vouchers'     => $this->pushVouchers($companyId, 'Payment', $records),
            'receipt_vouchers'     => $this->pushVouchers($companyId, 'Receipt', $records),
            'journal_vouchers'     => $this->pushVouchers($companyId, 'Journal', $records),
            'contra_vouchers'      => $this->pushVouchers($companyId, 'Contra', $records),
            'credit_notes'         => $this->pushVouchers($companyId, 'Credit Note', $records),
            'debit_notes'          => $this->pushVouchers($companyId, 'Debit Note', $records),
            'stock_journals'       => $this->pushVouchers($companyId, 'Stock Journal', $records),
            'delivery_challans'    => $this->pushVouchers($companyId, 'Delivery Note', $records),
            'sales_orders'         => $this->pushVouchers($companyId, 'Sales Order', $records),
            'purchase_orders'      => $this->pushVouchers($companyId, 'Purchase Order', $records),
            'day_book'             => $this->pushVouchers($companyId, null, $records),
            'trial_balance'        => $this->pushReport($companyId, 'trial_balance', $records),
            'profit_loss'          => $this->pushReport($companyId, 'profit_loss', $records),
            'balance_sheet'        => $this->pushReport($companyId, 'balance_sheet', $records),
            'hsn_summary'          => $this->pushReport($companyId, 'hsn_summary', $records),
            'gst_summary'          => $this->pushReport($companyId, 'gst_summary', $records),
            default                => Log::channel('tally')->warning("Unhandled module: {$module}"),
        };
    }

    // ─── Module handlers ──────────────────────────────────────────────────────────

    private function pushCompany(int $companyId, array $records): void
    {
        foreach ($records as $r) {
            Log::channel('tally')->info('Company', $r);
            /*
            TODO:
            DB::table('tally_companies')->updateOrInsert(
                ['company_id' => $companyId],
                [
                    'name'                 => $r['name'] ?? '',
                    'books_beginning_from' => $r['books_beginning_from'] ?? null,
                    'current_period_from'  => $r['current_period_from'] ?? null,
                    'current_period_to'    => $r['current_period_to'] ?? null,
                    'gstn'                 => $r['gstn'] ?? '',
                    'state'                => $r['state'] ?? '',
                    'pincode'              => $r['pincode'] ?? '',
                    'updated_at'           => now(),
                ]
            );
            */
        }
    }

    private function pushLedgers(int $companyId, array $records): void
    {
        foreach ($records as $r) {
            Log::channel('tally')->info('Ledger', ['ledger_name' => $r['ledger_name'] ?? '', 'parent' => $r['parent'] ?? '']);
            /*
            TODO:
            DB::table('tally_ledgers')->updateOrInsert(
                ['company_id' => $companyId, 'ledger_name' => $r['ledger_name']],
                [
                    'parent'          => $r['parent'] ?? '',
                    'opening_balance' => $r['opening_balance'] ?? 0,
                    'closing_balance' => $r['closing_balance'] ?? 0,
                    'gstin'           => $r['gstin'] ?? '',
                    'gstn_type'       => $r['gstn_type'] ?? '',
                    'mobile'          => $r['mobile'] ?? '',
                    'email'           => $r['email'] ?? '',
                    'state'           => $r['state'] ?? '',
                    'pincode'         => $r['pincode'] ?? '',
                    'mailing_name'    => $r['mailing_name'] ?? '',
                    'updated_at'      => now(),
                ]
            );
            */
        }
    }

    private function pushStockGroups(int $companyId, array $records): void
    {
        foreach ($records as $r) {
            Log::channel('tally')->info('StockGroup', ['name' => $r['name'] ?? '']);
            /*
            TODO:
            DB::table('tally_stock_groups')->updateOrInsert(
                ['company_id' => $companyId, 'name' => $r['name']],
                ['parent' => $r['parent'] ?? '', 'is_addable' => $r['is_addable'] ?? '', 'updated_at' => now()]
            );
            */
        }
    }

    private function pushStockCategories(int $companyId, array $records): void
    {
        foreach ($records as $r) {
            Log::channel('tally')->info('StockCategory', ['name' => $r['name'] ?? '']);
            /*
            TODO:
            DB::table('tally_stock_categories')->updateOrInsert(
                ['company_id' => $companyId, 'name' => $r['name']],
                ['parent' => $r['parent'] ?? '', 'updated_at' => now()]
            );
            */
        }
    }

    private function pushStockItems(int $companyId, array $records): void
    {
        foreach ($records as $r) {
            Log::channel('tally')->info('StockItem', ['name' => $r['name'] ?? '', 'hsn' => $r['hsn_code'] ?? '']);
            /*
            TODO:
            DB::table('tally_stock_items')->updateOrInsert(
                ['company_id' => $companyId, 'name' => $r['name']],
                [
                    'parent'              => $r['parent'] ?? '',
                    'category'            => $r['category'] ?? '',
                    'base_units'          => $r['base_units'] ?? '',
                    'gst_applicable'      => $r['gst_applicable'] ?? '',
                    'hsn_code'            => $r['hsn_code'] ?? '',
                    'gst_type_of_supply'  => $r['gst_type_of_supply'] ?? '',
                    'opening_balance'     => $r['opening_balance'] ?? 0,
                    'opening_value'       => $r['opening_value'] ?? 0,
                    'opening_rate'        => $r['opening_rate'] ?? 0,
                    'closing_balance'     => $r['closing_balance'] ?? 0,
                    'closing_value'       => $r['closing_value'] ?? 0,
                    'updated_at'          => now(),
                ]
            );
            */
        }
    }

    private function pushUnits(int $companyId, array $records): void
    {
        foreach ($records as $r) {
            Log::channel('tally')->info('Unit', ['name' => $r['name'] ?? '']);
            /*
            TODO:
            DB::table('tally_units')->updateOrInsert(
                ['company_id' => $companyId, 'name' => $r['name']],
                ['symbol' => $r['symbol'] ?? '', 'formal_name' => $r['formal_name'] ?? '', 'updated_at' => now()]
            );
            */
        }
    }

    private function pushGodowns(int $companyId, array $records): void
    {
        foreach ($records as $r) {
            Log::channel('tally')->info('Godown', ['name' => $r['name'] ?? '']);
            /*
            TODO:
            DB::table('tally_godowns')->updateOrInsert(
                ['company_id' => $companyId, 'name' => $r['name']],
                ['parent' => $r['parent'] ?? '', 'address' => $r['address'] ?? '', 'is_internal' => $r['is_internal'] ?? '', 'updated_at' => now()]
            );
            */
        }
    }

    private function pushCostCentres(int $companyId, array $records): void
    {
        foreach ($records as $r) {
            Log::channel('tally')->info('CostCentre', ['name' => $r['name'] ?? '']);
            /*
            TODO:
            DB::table('tally_cost_centres')->updateOrInsert(
                ['company_id' => $companyId, 'name' => $r['name']],
                ['parent' => $r['parent'] ?? '', 'category' => $r['category'] ?? '', 'updated_at' => now()]
            );
            */
        }
    }

    private function pushCostCategories(int $companyId, array $records): void
    {
        foreach ($records as $r) {
            Log::channel('tally')->info('CostCategory', ['name' => $r['name'] ?? '']);
            /*
            TODO:
            DB::table('tally_cost_categories')->updateOrInsert(
                ['company_id' => $companyId, 'name' => $r['name']],
                ['allocate_revenue' => $r['allocate_revenue'] ?? '', 'allocate_non_revenue' => $r['allocate_non_revenue'] ?? '', 'updated_at' => now()]
            );
            */
        }
    }

    private function pushVoucherTypes(int $companyId, array $records): void
    {
        foreach ($records as $r) {
            Log::channel('tally')->info('VoucherType', ['name' => $r['name'] ?? '']);
            /*
            TODO:
            DB::table('tally_voucher_types')->updateOrInsert(
                ['company_id' => $companyId, 'name' => $r['name']],
                ['parent' => $r['parent'] ?? '', 'is_active' => $r['is_active'] ?? '', 'numbering_method' => $r['numbering_method'] ?? '', 'updated_at' => now()]
            );
            */
        }
    }

    private function pushBatchDetails(int $companyId, array $records): void
    {
        foreach ($records as $r) {
            Log::channel('tally')->info('Batch', ['name' => $r['name'] ?? '', 'stock_item' => $r['stock_item'] ?? '']);
            /*
            TODO:
            DB::table('tally_batches')->updateOrInsert(
                ['company_id' => $companyId, 'name' => $r['name'], 'stock_item' => $r['stock_item']],
                [
                    'manufactured_on' => $r['manufactured_on'] ?? null,
                    'expiry_on'       => $r['expiry_on'] ?? null,
                    'opening_balance' => $r['opening_balance'] ?? 0,
                    'opening_value'   => $r['opening_value'] ?? 0,
                    'updated_at'      => now(),
                ]
            );
            */
        }
    }

    /** Used for all voucher types: Sales, Purchase, Payment, Receipt, Journal, Contra, etc. */
    private function pushVouchers(int $companyId, ?string $voucherType, array $records): void
    {
        foreach ($records as $v) {
            Log::channel('tally')->info('Voucher', [
                'type'           => $v['voucher_type'] ?? $voucherType ?? '',
                'voucher_number' => $v['voucher_number'] ?? '',
                'date'           => $v['date'] ?? '',
                'party'          => $v['party_ledger'] ?? '',
                'amount'         => $v['amount'] ?? 0,
            ]);
            /*
            TODO:
            $voucherId = DB::table('tally_vouchers')->updateOrInsert(
                [
                    'company_id'     => $companyId,
                    'voucher_number' => $v['voucher_number'],
                    'voucher_type'   => $v['voucher_type'] ?? $voucherType,
                ],
                [
                    'date'           => $v['date'] ?? null,
                    'narration'      => $v['narration'] ?? '',
                    'party_ledger'   => $v['party_ledger'] ?? '',
                    'amount'         => $v['amount'] ?? 0,
                    'is_cancelled'   => $v['is_cancelled'] ?? false,
                    'updated_at'     => now(),
                ]
            );

            // Ledger entries
            foreach ($v['ledger_entries'] ?? [] as $le) {
                DB::table('tally_voucher_ledgers')->insert([
                    'voucher_number' => $v['voucher_number'],
                    'company_id'     => $companyId,
                    'ledger_name'    => $le['ledger_name'] ?? '',
                    'amount'         => $le['amount'] ?? 0,
                    'is_party'       => $le['is_party_ledger'] ?? false,
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);
            }

            // Inventory entries
            foreach ($v['inventory_entries'] ?? [] as $ie) {
                DB::table('tally_voucher_items')->insert([
                    'voucher_number'  => $v['voucher_number'],
                    'company_id'      => $companyId,
                    'stock_item_name' => $ie['stock_item_name'] ?? '',
                    'quantity'        => $ie['quantity'] ?? 0,
                    'rate'            => $ie['rate'] ?? 0,
                    'amount'          => $ie['amount'] ?? 0,
                    'unit'            => $ie['unit'] ?? '',
                    'godown'          => $ie['godown'] ?? '',
                    'batch'           => $ie['batch'] ?? '',
                    'created_at'      => now(),
                    'updated_at'      => now(),
                ]);
            }
            */
        }
    }

    /** For Trial Balance, P&L, Balance Sheet, HSN Summary, GST Summary */
    private function pushReport(int $companyId, string $reportType, array $records): void
    {
        Log::channel('tally')->info("Report [{$reportType}]", ['company_id' => $companyId, 'payload_size' => count($records)]);
        /*
        TODO:
        DB::table('tally_reports')->updateOrInsert(
            ['company_id' => $companyId, 'report_type' => $reportType],
            ['data' => json_encode($records[0] ?? []), 'synced_at' => now(), 'updated_at' => now()]
        );
        */
    }
}
