<?php

/*

BLOCKSTRAP BOILERPLATE PHP
http://blockstrap.com

*/

error_reporting(-1);
$php_base = dirname(__FILE__);
$config = parse_ini_file(dirname($php_base).'/config.ini', true);
$template_header = file_get_contents($php_base.'/html/header.html');
$template_content = file_get_contents($php_base.'/html/index.html');
$template_footer = file_get_contents($php_base.'/html/footer.html');
$template = $template_header.$template_content.$template_footer;
$options = json_decode(file_get_contents($php_base.'/json/index.json'), true);
$options['config'] = $config;

include_once($php_base.'/php/mustache.php');

$mustache = new MustachePHP();
$html = $mustache->render($template, $options);
    
echo $html;