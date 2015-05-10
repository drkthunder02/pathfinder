<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no">

    <meta http-equiv="cache-control" content="public">

    <link rel="apple-touch-icon" sizes="57x57" href="favicons/apple-touch-icon-57x57.png">
    <link rel="apple-touch-icon" sizes="114x114" href="favicons/apple-touch-icon-114x114.png">
    <link rel="apple-touch-icon" sizes="72x72" href="favicons/apple-touch-icon-72x72.png">
    <link rel="apple-touch-icon" sizes="144x144" href="favicons/apple-touch-icon-144x144.png">
    <link rel="apple-touch-icon" sizes="60x60" href="favicons/apple-touch-icon-60x60.png">
    <link rel="apple-touch-icon" sizes="120x120" href="favicons/apple-touch-icon-120x120.png">
    <link rel="apple-touch-icon" sizes="76x76" href="favicons/apple-touch-icon-76x76.png">
    <link rel="apple-touch-icon" sizes="152x152" href="favicons/apple-touch-icon-152x152.png">
    <link rel="apple-touch-icon" sizes="180x180" href="favicons/apple-touch-icon-180x180.png">
    <link rel="icon" type="image/png" href="favicons/favicon-192x192.png" sizes="192x192">
    <link rel="icon" type="image/png" href="favicons/favicon-160x160.png" sizes="160x160">
    <link rel="icon" type="image/png" href="favicons/favicon-96x96.png" sizes="96x96">
    <link rel="icon" type="image/png" href="favicons/favicon-16x16.png" sizes="16x16">
    <link rel="icon" type="image/png" href="favicons/favicon-32x32.png" sizes="32x32">
    <meta name="msapplication-TileColor" content="#2d89ef">
    <meta name="msapplication-TileImage" content="favicons/mstile-144x144.png">
    <!--
        <meta http-equiv="Cache-Control" content="no-store" />
        <meta http-equiv="Pragma" content="no-cache" />
    -->
    <!-- TEMP  -->
    <meta http-equiv="no-cache">
    <meta http-equiv="Expires" content="-1">
    <meta http-equiv="Cache-Control" content="no-cache">

    <meta name="description" content="eve-online wormhole mapping tool">
    <meta name="keywords" content="eve,wormhole,mapping,tool,mmo,space,game,igb">
    <meta name="author" content="Exodus 4D">

    <title>Pathfinder</title>

    <link rel="stylesheet" type="text/css" media="screen" href="public/css/pathfinder.css">

</head>
<body class="<?php echo $bodyClass; ?>" data-trusted="<?php echo $trusted; ?>" data-script="<?php echo $jsView; ?>" >

    <?php if ($pageContent): ?>
        <?php echo $this->render($pageContent,$this->mime,get_defined_vars()); ?>
    <?php endif; ?>

    <script data-main="js/app" src="js/lib/require.js"></script>
</body>

</html>
