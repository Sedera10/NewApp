<?php
// modules/ws_stock_update/ws_stock_update.php

if (!defined('_PS_VERSION_')) {
    exit;
}

require_once _PS_MODULE_DIR_ . 'ws_stock_update/src/Entity/StockDelta.php';

class Ws_Stock_Update extends Module
{
    public function __construct()
    {
        $this->name          = 'ws_stock_update';
        $this->tab           = 'administration';
        $this->version       = '1.0.0';
        $this->author        = 'etu003365';
        $this->need_instance = 0;
        $this->bootstrap     = true;

        parent::__construct();

        $this->displayName = $this->l('WS Stock Update via Delta');
        $this->description = $this->l('Expose un endpoint webservice pour appeler StockAvailable::updateQuantity avec un delta.');
    }

    public function install()
    {
        return parent::install()
            && $this->installDB()
            && $this->registerHook('addWebserviceResources');
    }

    public function uninstall()
    {
        return parent::uninstall() && $this->uninstallDB();
    }

    private function installDB()
    {
        $sql = 'CREATE TABLE IF NOT EXISTS `' . _DB_PREFIX_ . 'stock_delta_ws` (
            `id_stock_delta`       INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
            `id_product`           INT(10) UNSIGNED NOT NULL,
            `id_product_attribute` INT(10) UNSIGNED NOT NULL DEFAULT 0,
            `delta`                INT(11) NOT NULL DEFAULT 0,
            `date_add`             DATETIME NOT NULL,
            PRIMARY KEY (`id_stock_delta`)
        ) ENGINE=' . _MYSQL_ENGINE_ . ' DEFAULT CHARSET=utf8mb4;';

        return Db::getInstance()->execute($sql);
    }

    private function uninstallDB()
    {
        return Db::getInstance()->execute(
            'DROP TABLE IF EXISTS `' . _DB_PREFIX_ . 'stock_delta_ws`'
        );
    }

    public function hookAddWebserviceResources($params)
    {
        return [
            'stock_deltas' => [
                'description'      => 'Appliquer un delta de stock via updateQuantity',
                'class'            => 'StockDelta',
                'forbidden_method' => ['PUT', 'PATCH', 'DELETE'], // lecture + POST uniquement
            ],
        ];
    }
}
