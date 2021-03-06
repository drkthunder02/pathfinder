/**
 * system route module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'bootbox',
    'app/map/util'
], function($, Init, Util, bootbox, MapUtil) {
    'use strict';

    let config = {
        // module info
        moduleClass: 'pf-module',                                               // class for each module

        routeCacheTTL: 10,                                                      // route cache timer (client) in seconds

        // system route module
        systemRouteModuleClass: 'pf-system-route-module',                       // class  for this module

        // headline toolbar
        systemModuleHeadlineIcon: 'pf-module-icon-button',                      // class for toolbar icons in the head
        systemModuleHeadlineIconSearch: 'pf-module-icon-button-search',         // class for "search" icon
        systemModuleHeadlineIconSettings: 'pf-module-icon-button-settings',     // class for "settings" icon
        systemModuleHeadlineIconRefresh: 'pf-module-icon-button-refresh',       // class for "refresh" icon

        systemSecurityClassPrefix: 'pf-system-security-',                       // prefix class for system security level (color)

        // dialog
        routeSettingsDialogId: 'pf-route-settings-dialog',                      // id for route "settings" dialog
        routeDialogId: 'pf-route-dialog',                                       // id for route "search" dialog
        systemDialogSelectClass: 'pf-system-dialog-select',                     // class for system select Element
        systemInfoRoutesTableClass: 'pf-system-route-table',                    // class for route tables
        mapSelectId: 'pf-route-dialog-map-select',                              // id for "map" select

        dataTableActionCellClass: 'pf-table-action-cell'                       // class for "action" cells
    };

    // cache for system routes
    let cache = {
        systemRoutes: {}                                                        // jump information between solar systems
    };

    /**
     * callback function, adds new row to a dataTable with jump information for a route
     * @param context
     * @param routesData
     */
    let callbackAddRouteRow = function(context, routesData){

        if(routesData.length > 0){
            for(let i = 0; i < routesData.length; i++){
                let routeData = routesData[i];

                // format routeData
                let rowData = formatRouteData(routeData);

                if(rowData.route){
                    let cacheKey = routeData.systemFromData.name.toLowerCase() +
                        '_' + routeData.systemToData.name.toLowerCase();

                    // update route cache
                    cache.systemRoutes[cacheKey] = {
                        data: rowData,
                        updated: Util.getServerTime().getTime() / 1000
                    };

                    let rowElement = addRow(context, rowData);

                    rowElement.initTooltips({
                        container: 'body'
                    });
                }
            }

            // redraw dataTable
            context.dataTable.draw();
        }
    };

    /**
     * add a new dataTable row to the routes table
     * @param context
     * @param rowData
     * @returns {*}
     */
    let addRow = function(context, rowData){
        let dataTable = context.dataTable;
        let rowElement = null;
        let row = null;
        let animationStatus = 'changed';

        // search for an existing row (e.g. on mass "table refresh" [all routes])
        // get rowIndex where column 1 (equals to "systemToData.name") matches rowData.systemToData.name
        let indexes = dataTable.rows().eq(0).filter( function (rowIdx) {
            return (dataTable.cell(rowIdx, 1 ).data().name === rowData.systemToData.name);
        });

        if(indexes.length > 0){
            // update row with FIRST index
            // -> systemFrom should be unique!
            row = dataTable.row( parseInt(indexes[0]) );
            // update row data
            row.data(rowData);
        }else{
            // no existing route found -> add new row
            row = dataTable.row.add( rowData );

            animationStatus = 'added';
        }

        if(row.length > 0){
            rowElement = row.nodes().to$();

            if(animationStatus !== null){
                rowElement.data('animationStatus', animationStatus);
            }
        }

        return rowElement;
    };


    /**
     * requests route data from eveCentral API and execute callback
     * @param requestData
     * @param context
     * @param callback
     */
    let getRouteData = function(requestData, context, callback){

        context.moduleElement.showLoadingAnimation();

        $.ajax({
            url: Init.path.searchRoute,
            type: 'POST',
            dataType: 'json',
            data: requestData,
            context: context
        }).done(function(routesData){
            this.moduleElement.hideLoadingAnimation();

            // execute callback
            callback(this, routesData.routesData);
        });

    };

    /**
     * update complete routes table (refresh all)
     * @param moduleElement
     * @param dataTable
     */
    let updateRoutesTable = function(moduleElement, dataTable){
        let context = {
            moduleElement: moduleElement,
            dataTable: dataTable
        };
        let routeData = [];

        dataTable.rows().every( function() {
            routeData.push( getRouteRequestDataFromRowData( this.data() ));
        });

        getRouteData({routeData: routeData}, context, callbackAddRouteRow);
    };

    /**
     * format rowData for route search/update request
     * @param {Object} rowData
     * @returns {Object}
     */
    let getRouteRequestDataFromRowData = function(rowData){
        return {
            mapIds: (rowData.hasOwnProperty('mapIds')) ? rowData.mapIds : [],
            systemFromData: (rowData.hasOwnProperty('systemFromData')) ? rowData.systemFromData : {},
            systemToData: (rowData.hasOwnProperty('systemToData')) ? rowData.systemToData : {},
            skipSearch: (rowData.hasOwnProperty('skipSearch')) ? rowData.skipSearch | 0 : 0,
            stargates: (rowData.hasOwnProperty('stargates')) ? rowData.stargates | 0 : 1,
            jumpbridges: (rowData.hasOwnProperty('jumpbridges')) ? rowData.jumpbridges | 0 : 1,
            wormholes: (rowData.hasOwnProperty('wormholes')) ? rowData.wormholes | 0 : 1,
            wormholesReduced: (rowData.hasOwnProperty('wormholesReduced')) ? rowData.wormholesReduced | 0 : 1,
            wormholesCritical: (rowData.hasOwnProperty('wormholesCritical')) ? rowData.wormholesCritical | 0 : 1,
            wormholesFrigate: (rowData.hasOwnProperty('wormholesFrigate')) ? rowData.wormholesFrigate | 0 : 1,
            wormholesEOL: (rowData.hasOwnProperty('wormholesEOL')) ? rowData.wormholesEOL | 0 : 1,
            safer: (rowData.hasOwnProperty('safer')) ? rowData.safer.value | 0 : 0
        };
    };

    /**
     * show route dialog. User can search for systems and jump-info for each system is added to a data table
     * @param dialogData
     */
    let showFindRouteDialog = function(dialogData){

        let mapSelectOptions = [];
        let currentMapData = Util.getCurrentMapData();
        if(currentMapData !== false){
            for(let i = 0; i < currentMapData.length; i++){
                mapSelectOptions.push({
                    id: currentMapData[i].config.id,
                    name: currentMapData[i].config.name,
                    selected: (dialogData.mapId === currentMapData[i].config.id)
                });
            }
        }
        let data = {
            id: config.routeDialogId,
            selectClass: config.systemDialogSelectClass,
            mapSelectId: config.mapSelectId,
            systemFromData: dialogData.systemFromData,
            mapSelectOptions: mapSelectOptions
        };

        requirejs(['text!templates/dialog/route.html', 'mustache'], function(template, Mustache) {

            let content = Mustache.render(template, data);

            let findRouteDialog = bootbox.dialog({
                title: 'Route finder',
                message: content,
                show: false,
                buttons: {
                    close: {
                        label: 'cancel',
                        className: 'btn-default'
                    },
                    success: {
                        label: '<i class="fa fa-fw fa-search"></i>&nbsp;search route',
                        className: 'btn-primary',
                        callback: function () {
                            // add new route to route table

                            // get form Values
                            let form = $('#' + config.routeDialogId).find('form');

                            let routeDialogData = $(form).getFormValues();

                            // validate form
                            form.validator('validate');

                            // check whether the form is valid
                            let formValid = form.isValidForm();

                            if(formValid === false){
                                // don't close dialog
                                return false;
                            }

                            // get all system data from select2
                            let systemSelectData = form.find('.' + config.systemDialogSelectClass).select2('data');

                            if(
                                systemSelectData &&
                                systemSelectData.length === 1
                            ){
                                let context = {
                                    moduleElement: dialogData.moduleElement,
                                    dataTable: dialogData.dataTable
                                };

                                let requestData = {
                                    routeData: [{
                                        mapIds: routeDialogData.mapIds,
                                        systemFromData: dialogData.systemFromData,
                                        systemToData: {
                                            systemId:  systemSelectData[0].systemId,
                                            name: systemSelectData[0].text
                                        },
                                        stargates: routeDialogData.hasOwnProperty('stargates') ? parseInt( routeDialogData.stargates ) : 0,
                                        jumpbridges: routeDialogData.hasOwnProperty('jumpbridges') ? parseInt( routeDialogData.jumpbridges ) : 0,
                                        wormholes: routeDialogData.hasOwnProperty('wormholes') ? parseInt( routeDialogData.wormholes ) : 0,
                                        wormholesReduced: routeDialogData.hasOwnProperty('wormholesReduced') ? parseInt( routeDialogData.wormholesReduced ) : 0,
                                        wormholesCritical: routeDialogData.hasOwnProperty('wormholesCritical') ? parseInt( routeDialogData.wormholesCritical ) : 0,
                                        wormholesFrigate: routeDialogData.hasOwnProperty('wormholesFrigate') ? parseInt( routeDialogData.wormholesFrigate ) : 0,
                                        wormholesEOL: routeDialogData.hasOwnProperty('wormholesEOL') ? parseInt( routeDialogData.wormholesEOL ) : 0
                                    }]
                                };

                                getRouteData(requestData, context, callbackAddRouteRow);
                            }
                        }
                    }
                }
            });

            findRouteDialog.on('show.bs.modal', function(e) {
                findRouteDialog.initTooltips();

                // init some dialog/form observer
                setDialogObserver( $(this) );

                // init map select ----------------------------------------------------------------
                let mapSelect = $(this).find('#' + config.mapSelectId);
                mapSelect.initMapSelect();
            });


            findRouteDialog.on('shown.bs.modal', function(e) {

                // init system select live  search ------------------------------------------------
                // -> add some delay until modal transition has finished
                let systemTargetSelect = $(this).find('.' + config.systemDialogSelectClass);
                systemTargetSelect.delay(240).initSystemSelect({key: 'name'});
            });

            // show dialog
            findRouteDialog.modal('show');
        });
    };

    /**
     * draw route table
     * @param  mapId
     * @param moduleElement
     * @param systemFromData
     * @param routesTable
     * @param systemsTo
     */
    let drawRouteTable = function(mapId, moduleElement, systemFromData, routesTable, systemsTo){
        let requestRouteData = [];
        let currentTimestamp = Util.getServerTime().getTime();

        // Skip some routes from search
        // -> this should help to throttle requests (heavy CPU load for route calculation)
        let defaultRoutesCount = Init.routeSearch.defaultCount;

        for(let i = 0; i < systemsTo.length; i++){
            let systemToData = systemsTo[i];

            if(systemFromData.name !== systemToData.name){
                let cacheKey = 'route_' + mapId + '_' + systemFromData.name.toUpperCase() + '_' + systemToData.name.toUpperCase();

                if(
                    cache.systemRoutes.hasOwnProperty(cacheKey) &&
                    Math.round(
                        ( currentTimestamp - (new Date( cache.systemRoutes[cacheKey].updated * 1000).getTime())) / 1000
                    ) <= config.routeCacheTTL
                ){
                    // route data is cached (client side)
                    let context = {
                        dataTable: routesTable
                    };

                    addRow(context, cache.systemRoutes[cacheKey].data);
                }else{
                    // get route data
                    let searchData = {
                        mapIds: [mapId],
                        systemFromData: systemFromData,
                        systemToData: systemToData,
                        skipSearch: requestRouteData.length >= defaultRoutesCount
                    };

                    requestRouteData.push( getRouteRequestDataFromRowData( searchData ));
                }
            }
        }

        // check if routes data is not cached and is requested
        if(requestRouteData.length > 0){
            let contextData = {
                moduleElement: moduleElement,
                dataTable: routesTable
            };

            let requestData = {
                routeData: requestRouteData
            };

            getRouteData(requestData, contextData, callbackAddRouteRow);
        }
    };

    /**
     * show route settings dialog
     * @param dialogData
     * @param moduleElement
     * @param systemFromData
     * @param routesTable
     */
    let showSettingsDialog = function(dialogData, moduleElement, systemFromData, routesTable){

        let promiseStore = MapUtil.getLocaleData('map', dialogData.mapId);
        promiseStore.then(function(dataStore) {
            // selected systems (if already stored)
            let systemSelectOptions = [];
            if(
                dataStore &&
                dataStore.routes
            ){
                systemSelectOptions = dataStore.routes;
            }

            // max count of "default" target systems
            let maxSelectionLength = Init.routeSearch.maxDefaultCount;

            let data = {
                id: config.routeSettingsDialogId,
                selectClass: config.systemDialogSelectClass,
                systemSelectOptions: systemSelectOptions,
                maxSelectionLength: maxSelectionLength
            };

            requirejs(['text!templates/dialog/route_settings.html', 'mustache'], function(template, Mustache) {
                let content = Mustache.render(template, data);

                let settingsDialog = bootbox.dialog({
                    title: 'Route settings',
                    message: content,
                    show: false,
                    buttons: {
                        close: {
                            label: 'cancel',
                            className: 'btn-default'
                        },
                        success: {
                            label: '<i class="fa fa-fw fa-check"></i>&nbsp;save',
                            className: 'btn-success',
                            callback: function () {
                                let form = this.find('form');
                                // get all system data from select2
                                let systemSelectData = form.find('.' + config.systemDialogSelectClass).select2('data');
                                let systemsTo = [];

                                if( systemSelectData.length > 0 ){
                                    systemsTo = formSystemSelectData(systemSelectData);
                                    MapUtil.storeLocalData('map', dialogData.mapId, 'routes', systemsTo);
                                }else{
                                    MapUtil.deleteLocalData('map', dialogData.mapId, 'routes');
                                }

                                Util.showNotify({title: 'Route settings stored', type: 'success'});

                                // (re) draw table
                                drawRouteTable(dialogData.mapId, moduleElement, systemFromData, routesTable, systemsTo);
                            }
                        }
                    }
                });

                settingsDialog.on('shown.bs.modal', function(e) {

                    // init default system select -----------------------------------------------------
                    // -> add some delay until modal transition has finished
                    let systemTargetSelect = $(this).find('.' + config.systemDialogSelectClass);
                    systemTargetSelect.delay(240).initSystemSelect({key: 'name', maxSelectionLength: maxSelectionLength});
                });

                // show dialog
                settingsDialog.modal('show');
            });
        });
    };

    /**
     * format select2 system data
     * @param {Array} data
     * @returns {Array}
     */
    let formSystemSelectData = function(data){
        let formattedData = [];
        for(let i = 0; i < data.length; i++){
            let tmpData = data[i];

            formattedData.push({
                name: tmpData.id,
                systemId: parseInt( tmpData.hasOwnProperty('systemId') ? tmpData.systemId : tmpData.element.getAttribute('data-systemid') )
            });
        }

        return formattedData;
    };

    /**
     * set event observer for route finder dialog
     * @param routeDialog
     */
    let setDialogObserver = function(routeDialog){
        let wormholeCheckbox = routeDialog.find('input[type="checkbox"][name="wormholes"]');
        let wormholeReducedCheckbox = routeDialog.find('input[type="checkbox"][name="wormholesReduced"]');
        let wormholeCriticalCheckbox = routeDialog.find('input[type="checkbox"][name="wormholesCritical"]');
        let wormholeFrigateCheckbox = routeDialog.find('input[type="checkbox"][name="wormholesFrigate"]');
        let wormholeEolCheckbox = routeDialog.find('input[type="checkbox"][name="wormholesEOL"]');

        // store current "checked" state for each box ---------------------------------------------
        let storeCheckboxStatus = function(){
            wormholeReducedCheckbox.data('selectState', wormholeReducedCheckbox.prop('checked'));
            wormholeCriticalCheckbox.data('selectState', wormholeCriticalCheckbox.prop('checked'));
            wormholeFrigateCheckbox.data('selectState', wormholeFrigateCheckbox.prop('checked'));
            wormholeEolCheckbox.data('selectState', wormholeEolCheckbox.prop('checked'));
        };

        // on wormhole checkbox change ------------------------------------------------------------
        let onWormholeCheckboxChange = function(){

            if( $(this).is(':checked') ){
                wormholeReducedCheckbox.prop('disabled', false);
                wormholeCriticalCheckbox.prop('disabled', false);
                wormholeFrigateCheckbox.prop('disabled', false);
                wormholeEolCheckbox.prop('disabled', false);

                wormholeReducedCheckbox.prop('checked', wormholeReducedCheckbox.data('selectState'));
                wormholeCriticalCheckbox.prop('checked', wormholeCriticalCheckbox.data('selectState'));
                wormholeFrigateCheckbox.prop('checked', wormholeFrigateCheckbox.data('selectState'));
                wormholeEolCheckbox.prop('checked', wormholeEolCheckbox.data('selectState'));
            }else{
                storeCheckboxStatus();

                wormholeReducedCheckbox.prop('checked', false);
                wormholeReducedCheckbox.prop('disabled', true);
                wormholeCriticalCheckbox.prop('checked', false);
                wormholeCriticalCheckbox.prop('disabled', true);
                wormholeFrigateCheckbox.prop('checked', false);
                wormholeFrigateCheckbox.prop('disabled', true);
                wormholeEolCheckbox.prop('checked', false);
                wormholeEolCheckbox.prop('disabled', true);
            }
        }.bind(wormholeCheckbox);

        wormholeCheckbox.on('change', onWormholeCheckboxChange);

        // initial checkbox check
        storeCheckboxStatus();
        onWormholeCheckboxChange();
    };

    /**
     * format route data from API request into dataTable row format
     * @param routeData
     * @returns {{}}
     */
    let formatRouteData = function(routeData){

        /**
         * get status icon for route
         * @param status
         * @returns {string}
         */
        let getStatusIcon= function(status){
            let color = 'txt-color-danger';
            let title = 'route not found';
            switch(status){
                case 1:
                    color = 'txt-color-success';
                    title = 'route exists';
                    break;
                case 2:
                    color = 'txt-color-warning';
                    title = 'not search performed';
                    break;
            }

            return '<i class="fa fa-fw fa-circle txt-color ' + color + '" title="' + title + '"></i>';
        };

        // route status:
        // 0: not found
        // 1: round (OK)
        // 2: not searched
        let routeStatus = routeData.skipSearch ? 2 : 0;

        // button class for "safer" routes
        let saferButtonClass = routeData.safer ? 'txt-color-success' : '';

        let saferButton = '<i class="fa ' + ['fa-shield', 'txt-color', saferButtonClass].join(' ') + '"></i>';
        let reloadButton = '<i class="fa ' + ['fa-refresh'].join(' ') + '"></i>';
        let searchButton = '<i class="fa ' + ['fa-search-plus '].join(' ') + '"></i>';
        let deleteButton = '<i class="fa ' + ['fa-close', 'txt-color', 'txt-color-redDarker'].join(' ') + '"></i>';

        // default row data (e.g. no route found)
        let tableRowData = {
            systemFromData:  routeData.systemFromData,
            systemToData:  routeData.systemToData,
            jumps: {
                value: 9999, // for sorting
                formatted: ''
            },
            avgTrueSec: {
                value: '',
                formatted: ''
            },
            route: routeStatus === 2 ? 'search now' : 'not found',
            stargates: routeData.stargates,
            jumpbridges: routeData.jumpbridges,
            wormholes: routeData.wormholes,
            wormholesReduced: routeData.wormholesReduced,
            wormholesCritical: routeData.wormholesCritical,
            wormholesFrigate: routeData.wormholesFrigate,
            wormholesEOL: routeData.wormholesEOL,
            safer: {
                value: routeData.safer,
                button: saferButton
            },
            reload: {
                button: routeData.skipSearch ? searchButton : reloadButton
            },
            clear: {
                button: deleteButton
            },
            maps: routeData.maps,
            mapIds: routeData.mapIds //map data (mapIds is "redundant")
        };

        if(
            routeData.routePossible === true &&
            routeData.route.length > 0
        ){
            // route data available
            routeStatus = 1;

            // add route Data
            let jumpData = [];
            let avgSecTemp = 0;

            // loop all systems on this route
            for(let i = 0; i < routeData.route.length; i++){
                let routeNodeData = routeData.route[i];
                // format system name
                let systemName = routeNodeData.system;

                let systemSec = Number(routeNodeData.security).toFixed(1).toString();
                let tempSystemSec = systemSec;

                if(tempSystemSec <= 0){
                    tempSystemSec = '0-0';
                }

                let systemSecClass = config.systemSecurityClassPrefix + tempSystemSec.replace('.', '-');

                // check for wormhole
                let icon = 'fa-square';
                if( /^J\d+$/.test(systemName) ){
                    icon = 'fa-dot-circle-o';
                }

                let system = '<i class="fa ' + icon + ' ' + systemSecClass + '" ';
                system += 'data-toggle="tooltip" data-placement="bottom" data-container="body" ';
                system += 'title="' + systemName + ' [' + systemSec + '] "></i>';
                jumpData.push( system );

                // "source" system is not relevant for average security
                if(i > 0){
                    avgSecTemp += Number(routeNodeData.security);
                }
            }

            let avgSec = ( avgSecTemp /  (routeData.route.length - 1)).toFixed(2);
            let avgSecForClass = Number(avgSec).toFixed(1);

            if(avgSecForClass <= 0){
                avgSecForClass = '0.0';
            }

            let avgSecClass = config.systemSecurityClassPrefix + avgSecForClass.toString().replace('.', '-');

            tableRowData.jumps = {
                value: routeData.routeJumps,
                formatted: routeData.routeJumps
            };

            tableRowData.avgTrueSec = {
                value: avgSec,
                formatted: '<span class="' + avgSecClass + '">' + avgSec + '</span>'
            };
            tableRowData.route = jumpData.join(' ');
        }

        // route status data ----------------------------------------------------------------------
        tableRowData.status = {
            value: routeStatus,
            formatted: getStatusIcon(routeStatus)
        };

        return tableRowData;
    };

    /**
     * get the route finder moduleElement
     * @returns {*}
     */
    let getModule = function(){

        // create new module container
        let moduleElement = $('<div>', {
            class: [config.moduleClass, config.systemRouteModuleClass].join(' ')
        });

        // headline toolbar icons
        let headlineToolbar  = $('<h5>', {
            class: 'pull-right'
        }).append(
            $('<i>', {
                class: ['fa', 'fa-fw', 'fa-search', config.systemModuleHeadlineIcon, config.systemModuleHeadlineIconSearch].join(' '),
                title: 'find&nbsp;route'
            }).attr('data-html', 'true').attr('data-toggle', 'tooltip'),
            $('<i>', {
                class: ['fa', 'fa-fw', 'fa-sliders', config.systemModuleHeadlineIcon, config.systemModuleHeadlineIconSettings].join(' '),
                title: 'settings'
            }).attr('data-html', 'true').attr('data-toggle', 'tooltip'),
            $('<i>', {
                class: ['fa', 'fa-fw', 'fa-refresh', config.systemModuleHeadlineIcon, config.systemModuleHeadlineIconRefresh].join(' '),
                title: 'refresh&nbsp;all'
            }).attr('data-html', 'true').attr('data-toggle', 'tooltip')
        );

        moduleElement.append(headlineToolbar);

        // headline
        let headline = $('<h5>', {
            class: 'pull-left',
            text: 'Routes'
        });

        moduleElement.append(headline);

        // crate new route table
        let table = $('<table>', {
            class: ['compact', 'stripe', 'order-column', 'row-border', config.systemInfoRoutesTableClass].join(' ')
        });

        moduleElement.append( $(table) );

        // init empty table
        let routesTable = table.DataTable( {
            paging: false,
            ordering: true,
            order: [[ 2, 'asc' ], [ 0, 'asc' ]],
            info: false,
            searching: false,
            hover: false,
            autoWidth: false,
            rowId: 'systemTo',
            language: {
                emptyTable:  'No routes added'
            },
            columnDefs: [
                {
                    targets: 0,
                    orderable: true,
                    title: '',
                    width: '10px',
                    class: ['text-center'].join(' '),
                    data: 'status',
                    render: {
                        _: 'formatted',
                        sort: 'value'
                    }
                },{
                    targets: 1,
                    orderable: true,
                    title: 'system&nbsp;&nbsp;&nbsp;',
                    class: Util.config.popoverTriggerClass,
                    data: 'systemToData',
                    render: {
                        _: 'name',
                        sort: 'name'
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex) {
                        // init context menu
                        $(cell).initSystemPopover({
                            systemToData: rowData.systemToData
                        });
                    }
                },{
                    targets: 2,
                    orderable: true,
                    title: '<span title="jumps" data-toggle="tooltip"><i class="fa fa-arrows-h"></i>&nbsp;&nbsp;</span>',
                    width: '18px',
                    class: 'text-right',
                    data: 'jumps',
                    render: {
                        _: 'formatted',
                        sort: 'value'
                    }
                },{
                    targets: 3,
                    orderable: true,
                    title: '<span title="average security" data-toggle="tooltip">&#216;&nbsp;&nbsp;</span>',
                    width: '15px',
                    class: 'text-right',
                    data: 'avgTrueSec',
                    render: {
                        _: 'formatted',
                        sort: 'value'
                    }
                },{
                    targets: 4,
                    orderable: false,
                    title: 'route',
                    data: 'route'
                },{
                    targets: 5,
                    title: '<i title="search safer route (HS)" data-toggle="tooltip" class="fa fa-shield text-right"></i>',
                    orderable: false,
                    searchable: false,
                    width: '10px',
                    class: ['text-center', config.dataTableActionCellClass].join(' '),
                    data: 'safer',
                    render: {
                        _: 'button'
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        let tempTableApi = this.api();

                        $(cell).on('click', function(e) {
                            // get current row data (important!)
                            // -> "rowData" param is not current state, values are "on createCell()" state
                            rowData = tempTableApi.row( $(cell).parents('tr')).data();
                            let routeData = getRouteRequestDataFromRowData( rowData );

                            // overwrite some params
                            routeData.skipSearch = 0;
                            routeData.safer = 1 - routeData.safer; // toggle

                            let context = {
                                moduleElement: moduleElement,
                                dataTable: tempTableApi
                            };

                            let requestData = {
                                routeData: [routeData]
                            };

                            getRouteData(requestData, context, callbackAddRouteRow);
                        });
                    }
                },{
                    targets: 6,
                    title: '',
                    orderable: false,
                    searchable: false,
                    width: '10px',
                    class: ['text-center', config.dataTableActionCellClass].join(' '),
                    data: 'reload',
                    render: {
                        _: 'button'
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        let tempTableApi = this.api();

                        $(cell).on('click', function(e) {
                            // get current row data (important!)
                            // -> "rowData" param is not current state, values are "on createCell()" state
                            rowData = tempTableApi.row( $(cell).parents('tr')).data();
                            let routeData = getRouteRequestDataFromRowData( rowData );

                            // overwrite some params
                            routeData.skipSearch = 0;

                            let context = {
                                moduleElement: moduleElement,
                                dataTable: tempTableApi
                            };

                            let requestData = {
                                routeData: [routeData]
                            };

                            getRouteData(requestData, context, callbackAddRouteRow);
                        });
                    }
                },{
                    targets: 7,
                    title: '',
                    orderable: false,
                    searchable: false,
                    width: '10px',
                    class: ['text-center', config.dataTableActionCellClass].join(' '),
                    data: 'clear',
                    render: {
                        _: 'button'
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        let tempTableElement = this;

                        let confirmationSettings = {
                            container: 'body',
                            placement: 'left',
                            btnCancelClass: 'btn btn-sm btn-default',
                            btnCancelLabel: 'cancel',
                            btnCancelIcon: 'fa fa-fw fa-ban',
                            title: 'delete route',
                            btnOkClass: 'btn btn-sm btn-danger',
                            btnOkLabel: 'delete',
                            btnOkIcon: 'fa fa-fw fa-close',
                            onConfirm : function(e, target){
                                let deleteRowElement = $(cell).parents('tr');
                                tempTableElement.api().rows(deleteRowElement).remove().draw();
                            }
                        };

                        // init confirmation dialog
                        $(cell).confirmation(confirmationSettings);
                    }
                }
            ],
            drawCallback: function(settings){

                let animationRows = this.api().rows().nodes().to$().filter(function() {
                    return (
                        $(this).data('animationStatus') ||
                        $(this).data('animationTimer')
                    );
                });

                for(let i = 0; i < animationRows.length; i++){
                    $(animationRows[i]).pulseTableRow($(animationRows[i]).data('animationStatus'));
                    $(animationRows[i]).removeData('animationStatus');
                }

            },
            data: [] // will be added dynamic
        });

        // init tooltips for this module
        let tooltipElements = moduleElement.find('[data-toggle="tooltip"]');
        tooltipElements.tooltip({
            container: 'body'
        });

        return moduleElement;
    };


    /**
     * init system popover (e.g. for setWaypoints)
     * @param options
     */
    $.fn.initSystemPopover = function(options){
        let elements = $(this);
        let eventNamespace = 'hideSystemPopup';
        let systemToData = options.systemToData;

        requirejs(['text!templates/tooltip/system_popover.html', 'mustache'], function (template, Mustache) {
            let data = {
                systemToData: systemToData
            };

            let content = Mustache.render(template, data);

            elements.each(function() {
                let element = $(this);
                // destroy "popover" and remove "click" event for animation
                element.popover('destroy').off();

                // init popover and add specific class to it (for styling)
                element.popover({
                    html: true,
                    title: systemToData.name,
                    trigger: 'manual',
                    placement: 'top',
                    container: 'body',
                    content: content
                }).data('bs.popover').tip().addClass('pf-popover');
            });

            // set popup "close" observer
            elements.initPopoverClose(eventNamespace);

            // set "open" trigger on "right click"
            // -> this is not supported by the "trigger" param in .popover();
            // -> therefore we need to set it up manually
            elements.on('contextmenu', function(e){
                e.preventDefault();
               $(this).popover('show');
            });

            // set link observer "on shown" event
            elements.on('shown.bs.popover', function () {
                let popoverRoot = $(this);

                popoverRoot.data('bs.popover').tip().find('a').on('click', function(){
                    // hint: "data" attributes should be in lower case!
                    let systemData = {
                        name: $(this).data('name'),
                        systemId: $(this).data('systemid')
                    };
                    Util.setDestination(systemData, 'set_destination');

                    // close popover
                    popoverRoot.popover('hide');
                });
            });
        });
    };

    /**
     * init route module
     * -> request route path fore "default" trade hub systems
     * @param moduleElement
     * @param mapId
     * @param systemData
     */
    let initModule = function(moduleElement, mapId, systemData){

        let systemFromData = {
            name: systemData.name,
            systemId: systemData.systemId
        };

        let routesTableElement =  moduleElement.find('.' + config.systemInfoRoutesTableClass);

        let routesTable = routesTableElement.DataTable();

        // init refresh routes --------------------------------------------------------------------
        moduleElement.find('.' + config.systemModuleHeadlineIconRefresh).on('click', function(e){
            updateRoutesTable(moduleElement, routesTable);
        });

        // init search routes dialog --------------------------------------------------------------
        moduleElement.find('.' + config.systemModuleHeadlineIconSearch).on('click', function(e){
            let maxRouteSearchLimit = this.Init.routeSearch.limit;

            if(routesTable.rows().count() >= maxRouteSearchLimit){
                // max routes limit reached -> show warning
                Util.showNotify({title: 'Route limit reached', text: 'Serch is limited by ' + maxRouteSearchLimit, type: 'warning'});
            }else{
                let dialogData = {
                    moduleElement: moduleElement,
                    mapId: mapId,
                    systemFromData: systemFromData,
                    dataTable: routesTable
                };

                showFindRouteDialog(dialogData);
            }
        }.bind({
            Init: Init
        }));

        // init settings dialog -------------------------------------------------------------------
        moduleElement.find('.' + config.systemModuleHeadlineIconSettings).on('click', function(e){
            let dialogData = {
                mapId: mapId
            };

            showSettingsDialog(dialogData, moduleElement, systemFromData, routesTable);
        });

        // fill routesTable with data -------------------------------------------------------------
        let promiseStore = MapUtil.getLocaleData('map', mapId);
        promiseStore.then(function(dataStore) {
            // selected systems (if already stored)
            let systemsTo = [{
                name: 'Jita',
                systemId: 30000142
            }];

            if(
                dataStore &&
                dataStore.routes
            ){
                systemsTo = dataStore.routes;
            }

            drawRouteTable(mapId, moduleElement, systemFromData, routesTable, systemsTo);
        });

    };

    /**
     * updates an dom element with the system route module
     * @param mapId
     * @param systemData
     */
    $.fn.drawSystemRouteModule = function(mapId, systemData){

        let parentElement = $(this);

        // show route module
        let showModule = function(moduleElement){
            if(moduleElement){
                moduleElement.css({ opacity: 0 });
                parentElement.append(moduleElement);

                moduleElement.velocity('transition.slideDownIn', {
                    duration: Init.animationSpeed.mapModule,
                    delay: Init.animationSpeed.mapModule,
                    complete: function(){
                        initModule(moduleElement, mapId, systemData);
                    }
                });
            }
        };

        // check if module already exists
        let moduleElement = parentElement.find('.' + config.systemRouteModuleClass);

        if(moduleElement.length > 0){
            moduleElement.velocity('transition.slideDownOut', {
                duration: Init.animationSpeed.mapModule,
                complete: function(tempElement){
                    $(tempElement).remove();

                    moduleElement = getModule();
                    showModule(moduleElement);
                }
            });
        }else{
            moduleElement = getModule();
            showModule(moduleElement);
        }

    };

});