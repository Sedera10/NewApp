<?php
// modules/ws_stock_update/src/Entity/StockDelta.php

if (!defined('_PS_VERSION_')) {
    exit;
}

class StockDelta extends ObjectModel
{
    public $id_product;
    public $id_product_attribute;
    public $delta;
    public $date_add;

    public static $definition = [
        'table'   => 'stock_delta_ws',
        'primary' => 'id_stock_delta',
        'fields'  => [
            'id_product'           => ['type' => self::TYPE_INT,  'validate' => 'isUnsignedId', 'required' => true],
            'id_product_attribute' => ['type' => self::TYPE_INT,  'validate' => 'isUnsignedId'],
            'delta'                => ['type' => self::TYPE_INT,  'validate' => 'isInt',        'required' => true],
            'date_add'             => ['type' => self::TYPE_DATE, 'validate' => 'isDate'],
        ],
    ];

    protected $webserviceParameters = [
        'objectNodeName'  => 'stock_delta',
        'objectsNodeName' => 'stock_deltas',
        'fields' => [
            'id_product'           => ['required' => true],
            'id_product_attribute' => [],
            'delta'                => ['required' => true],
            'date_add'             => [],
        ],
    ];

    public function add($auto_date = false, $null_values = false)
    {
        $id_product           = (int) $this->id_product;
        $id_product_attribute = (int) $this->id_product_attribute;
        $delta                = (int) $this->delta;
        $date_add             = (!empty($this->date_add) && Validate::isDateFormat($this->date_add))
            ? $this->date_add
            : date('Y-m-d H:i:s');

        if ($id_product <= 0 || $delta === 0) {
            return false;
        }

        // Initialiser le shop context
        $context = Context::getContext();
        if (!isset($context->shop) || !$context->shop->id) {
            $context->shop = new Shop((int) Configuration::get('PS_SHOP_DEFAULT'));
            Shop::setContext(Shop::CONTEXT_SHOP, $context->shop->id);
        }
        
        $id_shop = (int) $context->shop->id;

        // Vérifier si la ligne stock_available existe pour ce produit
        $id_stock_available = (int) Db::getInstance()->getValue(
            'SELECT id_stock_available FROM `' . _DB_PREFIX_ . 'stock_available`
            WHERE id_product = ' . $id_product . '
            AND id_product_attribute = ' . $id_product_attribute . '
            AND id_shop = ' . $id_shop
        );

        if (!$id_stock_available) {
            Db::getInstance()->insert('stock_available', [
                'id_product'           => $id_product,
                'id_product_attribute' => $id_product_attribute,
                'id_shop'              => $id_shop,
                'id_shop_group'        => 0,
                'quantity'             => 0,
                'physical_quantity'    => 0,
                'reserved_quantity'    => 0,
                'depends_on_stock'     => 0,
                'out_of_stock'         => 0,
                'location'             => '',
            ]);

            PrestaShopLogger::addLog(
                '[ws_stock_update] stock_available créé pour product=' . $id_product . ' attr=' . $id_product_attribute,
                1, null, null, 'StockDelta', $id_product
            );
        }

        // Mettre à jour le stock disponible
        $updated = StockAvailable::updateQuantity(
            $id_product,
            $id_product_attribute,
            $delta,
            $id_shop
        );

        if (!$updated) {
            PrestaShopLogger::addLog(
                '[ws_stock_update] updateQuantity failed — product=' . $id_product . ' delta=' . $delta,
                3, null, null, 'StockDelta', $id_product
            );
            return false;
        }

        // =====================================================
        // NOUVEAU : Récupérer ou créer l'entrée dans ps_stock
        // pour que le mouvement soit visible dans le BO
        // =====================================================
        $id_stock = (int) Db::getInstance()->getValue(
            'SELECT id_stock_available FROM `' . _DB_PREFIX_ . 'stock_available`
             WHERE id_product = ' . $id_product . '
             AND id_product_attribute = ' . $id_product_attribute
        );

        if (!$id_stock) {
            // Récupérer la référence du produit
            $reference = (string) Db::getInstance()->getValue(
                'SELECT reference FROM `' . _DB_PREFIX_ . 'product`
                 WHERE id_product = ' . $id_product
            );

            Db::getInstance()->insert('stock', [
                'id_warehouse'         => 0,
                'id_product'           => $id_product,
                'id_product_attribute' => $id_product_attribute,
                'reference'            => pSQL($reference),
                'ean13'                => '',
                'isbn'                 => '',
                'upc'                  => '',
                'physical_quantity'    => 0,
                'usable_quantity'      => 0,
                'price_te'             => 0,
            ]);

            $id_stock = (int) Db::getInstance()->Insert_ID();

            PrestaShopLogger::addLog(
                '[ws_stock_update] ps_stock créé id_stock=' . $id_stock . ' pour product=' . $id_product,
                1, null, null, 'StockDelta', $id_product
            );
        }
        // =====================================================

        // Insérer le mouvement avec le vrai id_stock
        $id_reason   = $delta > 0 ? 1 : 2;
        $id_employee = (isset($context->employee) && $context->employee->id)
                       ? (int) $context->employee->id
                       : 0;
        $firstname   = ($id_employee && isset($context->employee)) ? $context->employee->firstname : 'MY';
        $lastname    = ($id_employee && isset($context->employee)) ? $context->employee->lastname  : 'API';
        $now         = $date_add;

        $mvt_result = Db::getInstance()->insert('stock_mvt', [
            'id_stock'            => $id_stock,  // ← vrai id_stock maintenant
            'id_order'            => 0,
            'id_supply_order'     => 0,
            'id_stock_mvt_reason' => $id_reason,
            'id_employee'         => $id_employee,
            'employee_firstname'  => pSQL($firstname),
            'employee_lastname'   => pSQL($lastname),
            'physical_quantity'   => abs($delta),
            'sign'                => $delta > 0 ? 1 : -1,
            'price_te'            => 0,
            'last_wa'             => 0,
            'current_wa'          => 0,
            'referer'             => 0,
            'date_add'            => $now,
        ]);

        PrestaShopLogger::addLog(
            '[ws_stock_update] stock_mvt insert=' . (int)$mvt_result . ' id_stock=' . $id_stock . ' error=' . Db::getInstance()->getMsgError(),
            1, null, null, 'StockDelta', $id_product
        );

        $this->date_add = $date_add;

        return parent::add(false, $null_values);
    }
}