var PROX_UNKNOWN = 'ProximityUnknown';
var PROX_FAR = 'ProximityFar';
var PROX_NEAR = 'ProximityNear';
var PROX_IMMEDIATE = 'ProximityImmediate';

var app = angular.module('myApp', ['onsen']);
//ニフティクラウドmobile backendアプリID
var ncmb_app_id = 'YOUR_APP_ID'; 

app.service('iBeaconService', function() {
    this.currentBeaconUuid = null;
    this.onDetectCallback = function(){};
    
    //ウォッチするビーコンリスト
    //例：mBaaS UUID = E2C56DB5-DFFB-48D2-B060-D0F5A71096E0
    var beacons = {
        "YOUR_UUID": {icon: 'img/mbaas.png', rssi: -63, proximity: PROX_UNKNOWN, name: 'NIFTY CLOUD MOBILE BACKEND BEACON', number: '1', id: 'com.nifty.mbaas', major: 1, minor: 1},
        };
    this.beacons = beacons;
    
    createBeacons = function() {
        var result = [];
        try {
            angular.forEach(beacons, function(value, key) {
                result.push(new cordova.plugins.locationManager.BeaconRegion(value.id, key));
            });
        } catch (e) {
            console.log('createBeacon err: ' + e);
        }
        return result;
    };
    
    this.watchBeacons = function(callback){
        document.addEventListener("deviceready", function(){
            var beacons = createBeacons();
            
            try {    
                var delegate = new cordova.plugins.locationManager.Delegate();

                delegate.didDetermineStateForRegion = function (pluginResult) {
                
                    console.log('[DOM] didDetermineStateForRegion: ' + JSON.stringify(pluginResult));
                    cordova.plugins.locationManager.appendToDeviceLog('[DOM] didDetermineStateForRegion: '
                        + JSON.stringify(pluginResult));
                };
                
                delegate.didStartMonitoringForRegion = function (pluginResult) {
                    console.log('didStartMonitoringForRegion:', pluginResult);
                    console.log('didStartMonitoringForRegion:' + JSON.stringify(pluginResult));
                };
                
                delegate.didRangeBeaconsInRegion = function (pluginResult) {
                    var beaconData = pluginResult.beacons[0];
                    var uuid = pluginResult.region.uuid.toUpperCase();
                    if (!beaconData || !uuid) {
                        return;
                    }
                    
                    callback(beaconData, uuid);
                    console.log('[DOM] didRangeBeaconsInRegion: ' + JSON.stringify(pluginResult));
                };
                
                cordova.plugins.locationManager.setDelegate(delegate);
                
                // required in iOS 8+
                cordova.plugins.locationManager.requestWhenInUseAuthorization(); 
                // or cordova.plugins.locationManager.requestAlwaysAuthorization()
                
                beacons.forEach(function(beacon) {
                    cordova.plugins.locationManager.startRangingBeaconsInRegion(beacon);
                });
                
            } catch (e) {
                console.log('Delegate err: ' + e);   
            }
        }, false);
    };
});

app.controller('InfoPageCtrl', ['$scope', 'iBeaconService', function($scope, iBeaconService) {
    $scope.beacon = iBeaconService.beacons[iBeaconService.currentBeaconUuid];
    $scope.beaconUuid = iBeaconService.currentBeaconUuid;
    
    $scope.showDetailCoupon = function() {
        var selectedBeacon = iBeaconService.beacons[iBeaconService.currentBeaconUuid];
        $scope.ons.navigator.pushPage('coupon-page.html', selectedBeacon);
    }
}]);
 
app.controller('CouponPageCtrl', ['$scope', 'iBeaconService', function($scope, iBeaconService) {
    $scope.beacon = iBeaconService.beacons[iBeaconService.currentBeaconUuid];
    $scope.beaconUuid = iBeaconService.currentBeaconUuid;
    //ニフティクラウドmobile backendサーバーからクーポン情報を取得
    //こちらにコードを追加
}]);

app.controller('TopPageCtrl', ['$scope', 'iBeaconService', function($scope, iBeaconService) {        
    
    $scope.beacons = iBeaconService.beacons;
    
    var callback = function(deviceData, uuid)
    {
        var beacon = $scope.beacons[uuid];
        $scope.$apply(function()
        {
            beacon.rssi = deviceData.rssi;
            switch (deviceData.proximity)
            {
                case PROX_IMMEDIATE:
                    beacon.proximity = 'Immediate';
                    break;
                case PROX_NEAR:
                    beacon.proximity = 'Near';
                    break;
                case PROX_FAR:
                    beacon.proximity = 'Far';
                    break;
                case PROX_UNKNOWN:
                default:
                    break;
            }

            if (iBeaconService.currentBeaconUuid === null && beacon.rssi > -45) {
                $scope.enterInfoPage(uuid);
            }
        });
    };
    iBeaconService.watchBeacons(callback);

    $scope.enterInfoPage = function(currentUuid) {
        iBeaconService.currentBeaconUuid = currentUuid;
        $scope.ons.navigator.pushPage('info-page.html');
        $scope.ons.navigator.on("prepop", function() {
        	iBeaconService.currentBeaconUuid = null;
        });
    };
    
}]);

