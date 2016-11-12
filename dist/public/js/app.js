angular.module('App', ['templates', 'ui.router', 'ngAnimate', 'ngRoute', 'angularMoment'])

.constant('Config', {
    apiBase: window.location.protocol + "//" + window.location.host + "/api/"
})

.config(function($stateProvider, $urlRouterProvider, $sceProvider, $locationProvider) {

    $sceProvider.enabled(false);
    $locationProvider.html5Mode(true);

    $stateProvider
        .state('quizz', {
            url: '/',
            templateUrl: 'quizz/index.html',
            controller: 'QuizzCtrl as Quizz'
        }).state('404', {
            url: '/404',
            templateUrl: 'errors/404.html'
        });

    $urlRouterProvider.otherwise(function($injector) {
        var $state;
        $state = $injector.get('$state');
        return $state.go('404', null, {
            location: false
        });
    });

})

.run(function($rootScope, $state, $timeout) {

    $rootScope.$state = $state;
    $rootScope.Math = Math;

    $rootScope.safeApply = function safeApply(operation) {
        var phase = this.$root.$$phase;
        if (phase !== '$apply' && phase !== '$digest') {
            this.$apply(operation);
            return;
        }

        if (operation && typeof operation === 'function') {
            operation();
        }
    };

})


//Probably should move this if we get more util shite
.filter('time', function() {
    return function(ms, precise) {

        var totalSeconds = ms / 1000;

        var hours = Math.floor(totalSeconds / 3600);
        var minutes = Math.floor(totalSeconds % 3600 / 60);
        var seconds = Math.floor(totalSeconds % 60);
        var milliseconds = Math.floor(ms % 1000);

        var ret;
        ret = hours ? hours + ":" : "";
        ret += (minutes || hours) || !precise ? (minutes < 10 ? '0' + minutes : minutes) + ":" : "";
        ret += seconds < 10 && !precise ? '0' + seconds : seconds;
        ret += precise ? '.' + (milliseconds < 10 ? '00' + milliseconds : (milliseconds < 100 ? '0' + milliseconds : milliseconds)) : "";

        return ret;
    };
});
angular.module('App')
    .controller('QuizzCtrl', function($rootScope, $state, Api) {

        var scope = this;
        scope.loading = true;

        scope.clipOptions = {};

        scope.clips = [{
            title: "MUT MUT ÉCARTEZ-VOUS (Euro Truck Simulator 2)",
            video_id: 'ADUJ87Wxyp4',
            thumbnail: 'https://i.ytimg.com/vi/ADUJ87Wxyp4/mqdefault.jpg',
            start_time: 181285,
            duration: 19172
        }, {
            title: "ET MAINTENANT, FERME TA GUEULE (DayZ)",
            video_id: '80jDpdh4wBc',
            thumbnail: 'https://i.ytimg.com/vi/80jDpdh4wBc/mqdefault.jpg',
            start_time: 466145,
            duration: 18681
        }, {
            title: "J'APPRENDRE LA SURVIE ET LA CONJUGAISON (H1Z1 Battle Royale)",
            video_id: '--6EQeJqf8E',
            thumbnail: 'https://i.ytimg.com/vi/--6EQeJqf8E/mqdefault.jpg',
            start_time: 450593,
            duration: 23160
        }, {
            title: "J'APPRENDRE LA SURVIE ET LA CONJUGAISON (H1Z1 Battle Royale)",
            video_id: '--6EQeJqf8E',
            thumbnail: 'https://i.ytimg.com/vi/--6EQeJqf8E/mqdefault.jpg',
            start_time: 435170,
            duration: 14830
        }, {
            title: "ET J'AI CRAMÉ (Half-Life 2 en COOP)",
            video_id: 'i-ELRMO3vHQ',
            thumbnail: 'https://i.ytimg.com/vi/i-ELRMO3vHQ/mqdefault.jpg',
            start_time: 701483,
            duration: 5000
        }];

        scope.actualPosition = 0;

        scope.videos = [];

        scope.answers = [];

        scope.initClip = function(position) {
            clip = scope.clips[position];
            scope.clipOptions = clip;
            scope.actualPosition = position;
            $rootScope.$emit('clipChanged', clip);
            scope.getAnswers();
        }



        scope.nextClip = function() {
            actualPosition = scope.actualPosition;
            if (actualPosition + 1 < 5) {
                scope.initClip(actualPosition + 1);
            }
        }

        scope.getVideos = function() {
            Api.call({
                url: 'https://www.googleapis.com/youtube/v3/search?key=AIzaSyBMDrVhmiR2Av3cBfm2_RM7XVvD6udLwuo&channelId=UCYGjxo5ifuhnmvhPvCc3DJQ&part=snippet&order=date&maxResults=50&type=video',
                method: 'GET',
                callback: function(res) {
                    scope.videos = res.items;
                    scope.getAnswers();
                }
            })
        }

        scope.deleteAnswers = function() {
            scope.answers = [];
        }

        scope.randomizeVideos = function() {
            scope.videos = scope.shuffle(scope.videos);
        }

        scope.shuffle = function(a) {
            var j, x, i;
            for (i = a.length; i; i--) {
                j = Math.floor(Math.random() * i);
                x = a[i - 1];
                a[i - 1] = a[j];
                a[j] = x;
            }
            return a;
        }

        scope.getAnswers = function() {
            scope.randomizeVideos();
            for (var i = 0; i < 3; i++) {
                scope.answers[i] = scope.videos[i];
            }
            scope.answers[3] = {
                id: scope.clips[scope.actualPosition].video_id,
                snippet: {
                    title: scope.clips[scope.actualPosition].title,
                    thumbnails: {
                        medium: {
                            url: scope.clips[scope.actualPosition].thumbnail
                        }
                    }
                }
            }
            scope.answers = scope.shuffle(scope.answers);
            console.log(scope.answers);
        }


        scope.initClip(0);
        scope.getVideos();

    });
angular.module('App')
    .directive('player', function(Api, $timeout, $interval) {

        return {
            restrict: 'E',
            replace: true,
            templateUrl: 'directives/player.html',
            scope: {
                //snip:    "=snip",
                clip: "=clip"
            },
            controllerAs: 'Player',
            bindToController: true,
            controller: function($scope, $element, $rootScope) {
                var scope = this;

                var defaultOptions = {
                    mode: 'view', //view/create
                };

                angular.extend(scope.clip, defaultOptions);

                var player, restartTimer, loopStarted, initInterval;

                function loop() {
                    player.seekTo(scope.clip.start_time / 1000, true);
                    player.playVideo();
                    restartTimer = $timeout(loop, scope.clip.duration);
                }

                function initYoutube() {
                    // console.log('initYoutube');
                    player = new YT.Player('ytplayer', {
                        height: '400',
                        width: '100%',
                        playerVars: {
                            controls: 0,
                            //autohide:       0,
                            autoplay: 1,
                            disablekb: 1,
                            enablejsapi: 1,
                            fs: 0,
                            modestbranding: 1, //only works with controls enabled
                            playsinline: 1,
                            showinfo: 0,
                            rel: 0,
                            theme: 'dark',
                        },
                        videoId: scope.clip.video_id,
                        events: {
                            'onReady': function() {

                                //Scale player
                                var containerWidth = $element[0].clientWidth;
                                player.getIframe().width = containerWidth;
                                player.getIframe().height = containerWidth * 0.5625;

                                player.seekTo(scope.clip.start_time / 1000, true);
                                //player.playVideo();
                            },
                            'onStateChange': function() {
                                if (player.getPlayerState() == 1 && !loopStarted) {
                                    loop();
                                    loopStarted = true;
                                }
                            }
                        }
                    });
                }

                initInterval = $interval(function() {
                    if (YT && YT.Player) {
                        $interval.cancel(initInterval);
                        initYoutube();
                    }
                }, 25);

                function changeClip(clip) {
                    player.destroy();
                    scope.clip = clip;
                    // console.log(scope.clip);
                    initYoutube();
                }

                $scope.$on('seekPlayer', function(event, ms) {
                    if (!loopStarted) return;
                    $timeout.cancel(restartTimer);
                    player.seekTo(ms / 1000, true);
                    player.pauseVideo(); //Yes or no?
                });

                $scope.$on('startLoop', function(event, ms) {
                    if (!loopStarted) return;
                    $timeout.cancel(restartTimer);
                    loop();
                });

                $scope.$on('playLastSecond', function(event, ms) {
                    if (!loopStarted) return;
                    $timeout.cancel(restartTimer);
                    player.seekTo((scope.clip.start_time + scope.clip.duration - 1000) / 1000, true);
                    player.playVideo();
                    restartTimer = $timeout(loop, 1000);
                });

                $scope.$on('$destroy', function() {
                    player.pauseVideo();
                    $timeout.cancel(restartTimer);
                    $interval.cancel(initInterval);
                })
                $rootScope.$on('clipChanged', function(e, c) {
                    changeClip(c)
                });

            }
        };

    });
angular.module('App').service('Api', function($http, $q, Config, $timeout) {


    /**
     * Perform an API call.
     * @param options {url, params, data, callback, method, errorHandler (should return true), timeout in MS, blockUI}
     */
    this.call = function(options) {

        var options = angular.extend({
            url: null,
            method: 'GET',
            params: null,
            data: null,
            callback: null,
            timeout: 30000,
            errorHandler: null,
            blockUI: true,
        }, options);

        var canceler = $q.defer();
        var cancelTimeout = options.timeout ? $timeout(canceler.resolve, options.timeout) : null;


        var url = options.url.indexOf('http') == 0 ? options.url : Config.apiBase + options.url;

        $http({
            url: url,
            method: options.method,
            params: options.params,
            data: options.data,
            timeout: canceler.promise
        }).success(function(data) {
            $timeout.cancel(cancelTimeout);
            if (typeof options.callback == 'function') {
                options.callback(data);
            }
        }).error(function(message, status) {
            $timeout.cancel(cancelTimeout);

            if (typeof options.errorHandler == 'function' && options.errorHandler(message, status)) {
                //Error was handled by the custom error handler
                return;
            }

            if (!status) {
                console.log("Error without status; request aborted?");
                return;
            }

        });

        return {
            cancel: function() {
                canceler.resolve();
            }
        };

    };

});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbnRyb2xsZXIvcXVpenouanMiLCJkaXJlY3RpdmVzL3BsYXllci5qcyIsInNlcnZpY2UvYXBpLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiYW5ndWxhci5tb2R1bGUoJ0FwcCcsIFsndGVtcGxhdGVzJywgJ3VpLnJvdXRlcicsICduZ0FuaW1hdGUnLCAnbmdSb3V0ZScsICdhbmd1bGFyTW9tZW50J10pXHJcblxyXG4uY29uc3RhbnQoJ0NvbmZpZycsIHtcclxuICAgIGFwaUJhc2U6IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArIFwiLy9cIiArIHdpbmRvdy5sb2NhdGlvbi5ob3N0ICsgXCIvYXBpL1wiXHJcbn0pXHJcblxyXG4uY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIsICRzY2VQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcclxuXHJcbiAgICAkc2NlUHJvdmlkZXIuZW5hYmxlZChmYWxzZSk7XHJcbiAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XHJcblxyXG4gICAgJHN0YXRlUHJvdmlkZXJcclxuICAgICAgICAuc3RhdGUoJ3F1aXp6Jywge1xyXG4gICAgICAgICAgICB1cmw6ICcvJyxcclxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdxdWl6ei9pbmRleC5odG1sJyxcclxuICAgICAgICAgICAgY29udHJvbGxlcjogJ1F1aXp6Q3RybCBhcyBRdWl6eidcclxuICAgICAgICB9KS5zdGF0ZSgnNDA0Jywge1xyXG4gICAgICAgICAgICB1cmw6ICcvNDA0JyxcclxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdlcnJvcnMvNDA0Lmh0bWwnXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZShmdW5jdGlvbigkaW5qZWN0b3IpIHtcclxuICAgICAgICB2YXIgJHN0YXRlO1xyXG4gICAgICAgICRzdGF0ZSA9ICRpbmplY3Rvci5nZXQoJyRzdGF0ZScpO1xyXG4gICAgICAgIHJldHVybiAkc3RhdGUuZ28oJzQwNCcsIG51bGwsIHtcclxuICAgICAgICAgICAgbG9jYXRpb246IGZhbHNlXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbn0pXHJcblxyXG4ucnVuKGZ1bmN0aW9uKCRyb290U2NvcGUsICRzdGF0ZSwgJHRpbWVvdXQpIHtcclxuXHJcbiAgICAkcm9vdFNjb3BlLiRzdGF0ZSA9ICRzdGF0ZTtcclxuICAgICRyb290U2NvcGUuTWF0aCA9IE1hdGg7XHJcblxyXG4gICAgJHJvb3RTY29wZS5zYWZlQXBwbHkgPSBmdW5jdGlvbiBzYWZlQXBwbHkob3BlcmF0aW9uKSB7XHJcbiAgICAgICAgdmFyIHBoYXNlID0gdGhpcy4kcm9vdC4kJHBoYXNlO1xyXG4gICAgICAgIGlmIChwaGFzZSAhPT0gJyRhcHBseScgJiYgcGhhc2UgIT09ICckZGlnZXN0Jykge1xyXG4gICAgICAgICAgICB0aGlzLiRhcHBseShvcGVyYXRpb24pO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAob3BlcmF0aW9uICYmIHR5cGVvZiBvcGVyYXRpb24gPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgb3BlcmF0aW9uKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbn0pXHJcblxyXG5cclxuLy9Qcm9iYWJseSBzaG91bGQgbW92ZSB0aGlzIGlmIHdlIGdldCBtb3JlIHV0aWwgc2hpdGVcclxuLmZpbHRlcigndGltZScsIGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKG1zLCBwcmVjaXNlKSB7XHJcblxyXG4gICAgICAgIHZhciB0b3RhbFNlY29uZHMgPSBtcyAvIDEwMDA7XHJcblxyXG4gICAgICAgIHZhciBob3VycyA9IE1hdGguZmxvb3IodG90YWxTZWNvbmRzIC8gMzYwMCk7XHJcbiAgICAgICAgdmFyIG1pbnV0ZXMgPSBNYXRoLmZsb29yKHRvdGFsU2Vjb25kcyAlIDM2MDAgLyA2MCk7XHJcbiAgICAgICAgdmFyIHNlY29uZHMgPSBNYXRoLmZsb29yKHRvdGFsU2Vjb25kcyAlIDYwKTtcclxuICAgICAgICB2YXIgbWlsbGlzZWNvbmRzID0gTWF0aC5mbG9vcihtcyAlIDEwMDApO1xyXG5cclxuICAgICAgICB2YXIgcmV0O1xyXG4gICAgICAgIHJldCA9IGhvdXJzID8gaG91cnMgKyBcIjpcIiA6IFwiXCI7XHJcbiAgICAgICAgcmV0ICs9IChtaW51dGVzIHx8IGhvdXJzKSB8fCAhcHJlY2lzZSA/IChtaW51dGVzIDwgMTAgPyAnMCcgKyBtaW51dGVzIDogbWludXRlcykgKyBcIjpcIiA6IFwiXCI7XHJcbiAgICAgICAgcmV0ICs9IHNlY29uZHMgPCAxMCAmJiAhcHJlY2lzZSA/ICcwJyArIHNlY29uZHMgOiBzZWNvbmRzO1xyXG4gICAgICAgIHJldCArPSBwcmVjaXNlID8gJy4nICsgKG1pbGxpc2Vjb25kcyA8IDEwID8gJzAwJyArIG1pbGxpc2Vjb25kcyA6IChtaWxsaXNlY29uZHMgPCAxMDAgPyAnMCcgKyBtaWxsaXNlY29uZHMgOiBtaWxsaXNlY29uZHMpKSA6IFwiXCI7XHJcblxyXG4gICAgICAgIHJldHVybiByZXQ7XHJcbiAgICB9O1xyXG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJylcclxuICAgIC5jb250cm9sbGVyKCdRdWl6ekN0cmwnLCBmdW5jdGlvbigkcm9vdFNjb3BlLCAkc3RhdGUsIEFwaSkge1xyXG5cclxuICAgICAgICB2YXIgc2NvcGUgPSB0aGlzO1xyXG4gICAgICAgIHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xyXG5cclxuICAgICAgICBzY29wZS5jbGlwT3B0aW9ucyA9IHt9O1xyXG5cclxuICAgICAgICBzY29wZS5jbGlwcyA9IFt7XHJcbiAgICAgICAgICAgIHRpdGxlOiBcIk1VVCBNVVQgw4lDQVJURVotVk9VUyAoRXVybyBUcnVjayBTaW11bGF0b3IgMilcIixcclxuICAgICAgICAgICAgdmlkZW9faWQ6ICdBRFVKODdXeHlwNCcsXHJcbiAgICAgICAgICAgIHRodW1ibmFpbDogJ2h0dHBzOi8vaS55dGltZy5jb20vdmkvQURVSjg3V3h5cDQvbXFkZWZhdWx0LmpwZycsXHJcbiAgICAgICAgICAgIHN0YXJ0X3RpbWU6IDE4MTI4NSxcclxuICAgICAgICAgICAgZHVyYXRpb246IDE5MTcyXHJcbiAgICAgICAgfSwge1xyXG4gICAgICAgICAgICB0aXRsZTogXCJFVCBNQUlOVEVOQU5ULCBGRVJNRSBUQSBHVUVVTEUgKERheVopXCIsXHJcbiAgICAgICAgICAgIHZpZGVvX2lkOiAnODBqRHBkaDR3QmMnLFxyXG4gICAgICAgICAgICB0aHVtYm5haWw6ICdodHRwczovL2kueXRpbWcuY29tL3ZpLzgwakRwZGg0d0JjL21xZGVmYXVsdC5qcGcnLFxyXG4gICAgICAgICAgICBzdGFydF90aW1lOiA0NjYxNDUsXHJcbiAgICAgICAgICAgIGR1cmF0aW9uOiAxODY4MVxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgICAgdGl0bGU6IFwiSidBUFBSRU5EUkUgTEEgU1VSVklFIEVUIExBIENPTkpVR0FJU09OIChIMVoxIEJhdHRsZSBSb3lhbGUpXCIsXHJcbiAgICAgICAgICAgIHZpZGVvX2lkOiAnLS02RVFlSnFmOEUnLFxyXG4gICAgICAgICAgICB0aHVtYm5haWw6ICdodHRwczovL2kueXRpbWcuY29tL3ZpLy0tNkVRZUpxZjhFL21xZGVmYXVsdC5qcGcnLFxyXG4gICAgICAgICAgICBzdGFydF90aW1lOiA0NTA1OTMsXHJcbiAgICAgICAgICAgIGR1cmF0aW9uOiAyMzE2MFxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgICAgdGl0bGU6IFwiSidBUFBSRU5EUkUgTEEgU1VSVklFIEVUIExBIENPTkpVR0FJU09OIChIMVoxIEJhdHRsZSBSb3lhbGUpXCIsXHJcbiAgICAgICAgICAgIHZpZGVvX2lkOiAnLS02RVFlSnFmOEUnLFxyXG4gICAgICAgICAgICB0aHVtYm5haWw6ICdodHRwczovL2kueXRpbWcuY29tL3ZpLy0tNkVRZUpxZjhFL21xZGVmYXVsdC5qcGcnLFxyXG4gICAgICAgICAgICBzdGFydF90aW1lOiA0MzUxNzAsXHJcbiAgICAgICAgICAgIGR1cmF0aW9uOiAxNDgzMFxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgICAgdGl0bGU6IFwiRVQgSidBSSBDUkFNw4kgKEhhbGYtTGlmZSAyIGVuIENPT1ApXCIsXHJcbiAgICAgICAgICAgIHZpZGVvX2lkOiAnaS1FTFJNTzN2SFEnLFxyXG4gICAgICAgICAgICB0aHVtYm5haWw6ICdodHRwczovL2kueXRpbWcuY29tL3ZpL2ktRUxSTU8zdkhRL21xZGVmYXVsdC5qcGcnLFxyXG4gICAgICAgICAgICBzdGFydF90aW1lOiA3MDE0ODMsXHJcbiAgICAgICAgICAgIGR1cmF0aW9uOiA1MDAwXHJcbiAgICAgICAgfV07XHJcblxyXG4gICAgICAgIHNjb3BlLmFjdHVhbFBvc2l0aW9uID0gMDtcclxuXHJcbiAgICAgICAgc2NvcGUudmlkZW9zID0gW107XHJcblxyXG4gICAgICAgIHNjb3BlLmFuc3dlcnMgPSBbXTtcclxuXHJcbiAgICAgICAgc2NvcGUuaW5pdENsaXAgPSBmdW5jdGlvbihwb3NpdGlvbikge1xyXG4gICAgICAgICAgICBjbGlwID0gc2NvcGUuY2xpcHNbcG9zaXRpb25dO1xyXG4gICAgICAgICAgICBzY29wZS5jbGlwT3B0aW9ucyA9IGNsaXA7XHJcbiAgICAgICAgICAgIHNjb3BlLmFjdHVhbFBvc2l0aW9uID0gcG9zaXRpb247XHJcbiAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJ2NsaXBDaGFuZ2VkJywgY2xpcCk7XHJcbiAgICAgICAgICAgIHNjb3BlLmdldEFuc3dlcnMoKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgc2NvcGUubmV4dENsaXAgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgYWN0dWFsUG9zaXRpb24gPSBzY29wZS5hY3R1YWxQb3NpdGlvbjtcclxuICAgICAgICAgICAgaWYgKGFjdHVhbFBvc2l0aW9uICsgMSA8IDUpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLmluaXRDbGlwKGFjdHVhbFBvc2l0aW9uICsgMSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLmdldFZpZGVvcyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBBcGkuY2FsbCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICdodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS95b3V0dWJlL3YzL3NlYXJjaD9rZXk9QUl6YVN5Qk1EclZobWlSMkF2M2NCZm0yX1JNN1hWdkQ2dWRMd3VvJmNoYW5uZWxJZD1VQ1lHanhvNWlmdWhubXZoUHZDYzNESlEmcGFydD1zbmlwcGV0Jm9yZGVyPWRhdGUmbWF4UmVzdWx0cz01MCZ0eXBlPXZpZGVvJyxcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24ocmVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudmlkZW9zID0gcmVzLml0ZW1zO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmdldEFuc3dlcnMoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLmRlbGV0ZUFuc3dlcnMgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUuYW5zd2VycyA9IFtdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUucmFuZG9taXplVmlkZW9zID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLnZpZGVvcyA9IHNjb3BlLnNodWZmbGUoc2NvcGUudmlkZW9zKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLnNodWZmbGUgPSBmdW5jdGlvbihhKSB7XHJcbiAgICAgICAgICAgIHZhciBqLCB4LCBpO1xyXG4gICAgICAgICAgICBmb3IgKGkgPSBhLmxlbmd0aDsgaTsgaS0tKSB7XHJcbiAgICAgICAgICAgICAgICBqID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogaSk7XHJcbiAgICAgICAgICAgICAgICB4ID0gYVtpIC0gMV07XHJcbiAgICAgICAgICAgICAgICBhW2kgLSAxXSA9IGFbal07XHJcbiAgICAgICAgICAgICAgICBhW2pdID0geDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gYTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLmdldEFuc3dlcnMgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUucmFuZG9taXplVmlkZW9zKCk7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMzsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5hbnN3ZXJzW2ldID0gc2NvcGUudmlkZW9zW2ldO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNjb3BlLmFuc3dlcnNbM10gPSB7XHJcbiAgICAgICAgICAgICAgICBpZDogc2NvcGUuY2xpcHNbc2NvcGUuYWN0dWFsUG9zaXRpb25dLnZpZGVvX2lkLFxyXG4gICAgICAgICAgICAgICAgc25pcHBldDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiBzY29wZS5jbGlwc1tzY29wZS5hY3R1YWxQb3NpdGlvbl0udGl0bGUsXHJcbiAgICAgICAgICAgICAgICAgICAgdGh1bWJuYWlsczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZWRpdW06IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogc2NvcGUuY2xpcHNbc2NvcGUuYWN0dWFsUG9zaXRpb25dLnRodW1ibmFpbFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNjb3BlLmFuc3dlcnMgPSBzY29wZS5zaHVmZmxlKHNjb3BlLmFuc3dlcnMpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhzY29wZS5hbnN3ZXJzKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBzY29wZS5pbml0Q2xpcCgwKTtcclxuICAgICAgICBzY29wZS5nZXRWaWRlb3MoKTtcclxuXHJcbiAgICB9KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJylcclxuICAgIC5kaXJlY3RpdmUoJ3BsYXllcicsIGZ1bmN0aW9uKEFwaSwgJHRpbWVvdXQsICRpbnRlcnZhbCkge1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2RpcmVjdGl2ZXMvcGxheWVyLmh0bWwnLFxyXG4gICAgICAgICAgICBzY29wZToge1xyXG4gICAgICAgICAgICAgICAgLy9zbmlwOiAgICBcIj1zbmlwXCIsXHJcbiAgICAgICAgICAgICAgICBjbGlwOiBcIj1jbGlwXCJcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAnUGxheWVyJyxcclxuICAgICAgICAgICAgYmluZFRvQ29udHJvbGxlcjogdHJ1ZSxcclxuICAgICAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCAkZWxlbWVudCwgJHJvb3RTY29wZSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHNjb3BlID0gdGhpcztcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgZGVmYXVsdE9wdGlvbnMgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbW9kZTogJ3ZpZXcnLCAvL3ZpZXcvY3JlYXRlXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZXh0ZW5kKHNjb3BlLmNsaXAsIGRlZmF1bHRPcHRpb25zKTtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgcGxheWVyLCByZXN0YXJ0VGltZXIsIGxvb3BTdGFydGVkLCBpbml0SW50ZXJ2YWw7XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gbG9vcCgpIHtcclxuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIuc2Vla1RvKHNjb3BlLmNsaXAuc3RhcnRfdGltZSAvIDEwMDAsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHBsYXllci5wbGF5VmlkZW8oKTtcclxuICAgICAgICAgICAgICAgICAgICByZXN0YXJ0VGltZXIgPSAkdGltZW91dChsb29wLCBzY29wZS5jbGlwLmR1cmF0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBpbml0WW91dHViZSgpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnaW5pdFlvdXR1YmUnKTtcclxuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIgPSBuZXcgWVQuUGxheWVyKCd5dHBsYXllcicsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAnNDAwJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6ICcxMDAlJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGxheWVyVmFyczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbHM6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2F1dG9oaWRlOiAgICAgICAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXV0b3BsYXk6IDEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxla2I6IDEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVqc2FwaTogMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZzOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9kZXN0YnJhbmRpbmc6IDEsIC8vb25seSB3b3JrcyB3aXRoIGNvbnRyb2xzIGVuYWJsZWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYXlzaW5saW5lOiAxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2hvd2luZm86IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWw6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGVtZTogJ2RhcmsnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2aWRlb0lkOiBzY29wZS5jbGlwLnZpZGVvX2lkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudHM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdvblJlYWR5JzogZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vU2NhbGUgcGxheWVyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnRhaW5lcldpZHRoID0gJGVsZW1lbnRbMF0uY2xpZW50V2lkdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxheWVyLmdldElmcmFtZSgpLndpZHRoID0gY29udGFpbmVyV2lkdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxheWVyLmdldElmcmFtZSgpLmhlaWdodCA9IGNvbnRhaW5lcldpZHRoICogMC41NjI1O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGF5ZXIuc2Vla1RvKHNjb3BlLmNsaXAuc3RhcnRfdGltZSAvIDEwMDAsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vcGxheWVyLnBsYXlWaWRlbygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdvblN0YXRlQ2hhbmdlJzogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBsYXllci5nZXRQbGF5ZXJTdGF0ZSgpID09IDEgJiYgIWxvb3BTdGFydGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvb3AoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9vcFN0YXJ0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGluaXRJbnRlcnZhbCA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoWVQgJiYgWVQuUGxheWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwoaW5pdEludGVydmFsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5pdFlvdXR1YmUoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LCAyNSk7XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gY2hhbmdlQ2xpcChjbGlwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGxheWVyLmRlc3Ryb3koKTtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5jbGlwID0gY2xpcDtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhzY29wZS5jbGlwKTtcclxuICAgICAgICAgICAgICAgICAgICBpbml0WW91dHViZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ3NlZWtQbGF5ZXInLCBmdW5jdGlvbihldmVudCwgbXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWxvb3BTdGFydGVkKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKHJlc3RhcnRUaW1lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgcGxheWVyLnNlZWtUbyhtcyAvIDEwMDAsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHBsYXllci5wYXVzZVZpZGVvKCk7IC8vWWVzIG9yIG5vP1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiRvbignc3RhcnRMb29wJywgZnVuY3Rpb24oZXZlbnQsIG1zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFsb29wU3RhcnRlZCkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChyZXN0YXJ0VGltZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvb3AoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ3BsYXlMYXN0U2Vjb25kJywgZnVuY3Rpb24oZXZlbnQsIG1zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFsb29wU3RhcnRlZCkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChyZXN0YXJ0VGltZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHBsYXllci5zZWVrVG8oKHNjb3BlLmNsaXAuc3RhcnRfdGltZSArIHNjb3BlLmNsaXAuZHVyYXRpb24gLSAxMDAwKSAvIDEwMDAsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHBsYXllci5wbGF5VmlkZW8oKTtcclxuICAgICAgICAgICAgICAgICAgICByZXN0YXJ0VGltZXIgPSAkdGltZW91dChsb29wLCAxMDAwKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGxheWVyLnBhdXNlVmlkZW8oKTtcclxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dC5jYW5jZWwocmVzdGFydFRpbWVyKTtcclxuICAgICAgICAgICAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKGluaXRJbnRlcnZhbCk7XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oJ2NsaXBDaGFuZ2VkJywgZnVuY3Rpb24oZSwgYykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZUNsaXAoYylcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgfSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpLnNlcnZpY2UoJ0FwaScsIGZ1bmN0aW9uKCRodHRwLCAkcSwgQ29uZmlnLCAkdGltZW91dCkge1xyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIFBlcmZvcm0gYW4gQVBJIGNhbGwuXHJcbiAgICAgKiBAcGFyYW0gb3B0aW9ucyB7dXJsLCBwYXJhbXMsIGRhdGEsIGNhbGxiYWNrLCBtZXRob2QsIGVycm9ySGFuZGxlciAoc2hvdWxkIHJldHVybiB0cnVlKSwgdGltZW91dCBpbiBNUywgYmxvY2tVSX1cclxuICAgICAqL1xyXG4gICAgdGhpcy5jYWxsID0gZnVuY3Rpb24ob3B0aW9ucykge1xyXG5cclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGFuZ3VsYXIuZXh0ZW5kKHtcclxuICAgICAgICAgICAgdXJsOiBudWxsLFxyXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgICAgICBwYXJhbXM6IG51bGwsXHJcbiAgICAgICAgICAgIGRhdGE6IG51bGwsXHJcbiAgICAgICAgICAgIGNhbGxiYWNrOiBudWxsLFxyXG4gICAgICAgICAgICB0aW1lb3V0OiAzMDAwMCxcclxuICAgICAgICAgICAgZXJyb3JIYW5kbGVyOiBudWxsLFxyXG4gICAgICAgICAgICBibG9ja1VJOiB0cnVlLFxyXG4gICAgICAgIH0sIG9wdGlvbnMpO1xyXG5cclxuICAgICAgICB2YXIgY2FuY2VsZXIgPSAkcS5kZWZlcigpO1xyXG4gICAgICAgIHZhciBjYW5jZWxUaW1lb3V0ID0gb3B0aW9ucy50aW1lb3V0ID8gJHRpbWVvdXQoY2FuY2VsZXIucmVzb2x2ZSwgb3B0aW9ucy50aW1lb3V0KSA6IG51bGw7XHJcblxyXG5cclxuICAgICAgICB2YXIgdXJsID0gb3B0aW9ucy51cmwuaW5kZXhPZignaHR0cCcpID09IDAgPyBvcHRpb25zLnVybCA6IENvbmZpZy5hcGlCYXNlICsgb3B0aW9ucy51cmw7XHJcblxyXG4gICAgICAgICRodHRwKHtcclxuICAgICAgICAgICAgdXJsOiB1cmwsXHJcbiAgICAgICAgICAgIG1ldGhvZDogb3B0aW9ucy5tZXRob2QsXHJcbiAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMsXHJcbiAgICAgICAgICAgIGRhdGE6IG9wdGlvbnMuZGF0YSxcclxuICAgICAgICAgICAgdGltZW91dDogY2FuY2VsZXIucHJvbWlzZVxyXG4gICAgICAgIH0pLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAkdGltZW91dC5jYW5jZWwoY2FuY2VsVGltZW91dCk7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5jYWxsYmFjayA9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICBvcHRpb25zLmNhbGxiYWNrKGRhdGEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSkuZXJyb3IoZnVuY3Rpb24obWVzc2FnZSwgc3RhdHVzKSB7XHJcbiAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChjYW5jZWxUaW1lb3V0KTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5lcnJvckhhbmRsZXIgPT0gJ2Z1bmN0aW9uJyAmJiBvcHRpb25zLmVycm9ySGFuZGxlcihtZXNzYWdlLCBzdGF0dXMpKSB7XHJcbiAgICAgICAgICAgICAgICAvL0Vycm9yIHdhcyBoYW5kbGVkIGJ5IHRoZSBjdXN0b20gZXJyb3IgaGFuZGxlclxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIXN0YXR1cykge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFcnJvciB3aXRob3V0IHN0YXR1czsgcmVxdWVzdCBhYm9ydGVkP1wiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgY2FuY2VsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIGNhbmNlbGVyLnJlc29sdmUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgfTtcclxuXHJcbn0pOyJdfQ==
