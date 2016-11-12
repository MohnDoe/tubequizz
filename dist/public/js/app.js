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
    .controller('QuizzCtrl', function($rootScope, $state, Api, $timeout) {

        var scope = this;
        scope.loading = true;
        scope.timer = 0; // in MS

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
            scope.resetTimer();
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
                id: {
                    videoId: scope.clips[scope.actualPosition].video_id
                },
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

        scope.answer = function(a) {
            current_clip_id = scope.clips[scope.actualPosition].video_id;
            if (current_clip_id == a) {
                console.log("win");
            } else {
                console.log('lol');
            }
            console.log(3000 - scope.timer);
            scope.nextClip();
        }

        $rootScope.$on('clipStarted', function(e) {
            console.log("e:clipStarted");
            scope.startTimer();
        });

        scope.startTimer = function() {
            scope.timer = 0;
            scope.timerTimeout = $timeout(scope.onTimeout, 10);
        }

        scope.resetTimer = function() {
            scope.stopTimer();
            scope.timer = 0;
        }

        scope.onTimeout = function() {
            scope.timer++;
            scope.timerTimeout = $timeout(scope.onTimeout, 10);
        }

        scope.stopTimer = function() {
            $timeout.cancel(scope.timerTimeout);
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

                var player, restartTimer, loopStarted, initInterval;

                function loop() {
                    console.log('loop started : st = ' + scope.clip.start_time + ' | duration = ' + scope.clip.duration);
                    player.seekTo(scope.clip.start_time / 1000, true);
                    // player.playVideo();
                    restartTimer = $timeout(loop, scope.clip.duration);
                }

                function initYoutube() {
                    // console.log('initYoutube');
                    loopStarted = false;
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
                                console.log('e:ytplayer:onReady');
                                //Scale player
                                var containerWidth = $element[0].clientWidth;
                                player.getIframe().width = containerWidth;
                                player.getIframe().height = containerWidth * 0.5625;

                                player.seekTo(scope.clip.start_time / 1000, true);
                                //player.playVideo();
                            },
                            'onStateChange': function() {
                                if (player.getPlayerState() == 1 && !loopStarted) {
                                    $rootScope.$emit('clipStarted');
                                    loopStarted = true;
                                    loop();
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

                $scope.$on('$destroy', function() {
                    console.log('e:$destroy');

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbnRyb2xsZXIvcXVpenouanMiLCJkaXJlY3RpdmVzL3BsYXllci5qcyIsInNlcnZpY2UvYXBpLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiYW5ndWxhci5tb2R1bGUoJ0FwcCcsIFsndGVtcGxhdGVzJywgJ3VpLnJvdXRlcicsICduZ0FuaW1hdGUnLCAnbmdSb3V0ZScsICdhbmd1bGFyTW9tZW50J10pXHJcblxyXG4uY29uc3RhbnQoJ0NvbmZpZycsIHtcclxuICAgIGFwaUJhc2U6IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArIFwiLy9cIiArIHdpbmRvdy5sb2NhdGlvbi5ob3N0ICsgXCIvYXBpL1wiXHJcbn0pXHJcblxyXG4uY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIsICRzY2VQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcclxuXHJcbiAgICAkc2NlUHJvdmlkZXIuZW5hYmxlZChmYWxzZSk7XHJcbiAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XHJcblxyXG4gICAgJHN0YXRlUHJvdmlkZXJcclxuICAgICAgICAuc3RhdGUoJ3F1aXp6Jywge1xyXG4gICAgICAgICAgICB1cmw6ICcvJyxcclxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdxdWl6ei9pbmRleC5odG1sJyxcclxuICAgICAgICAgICAgY29udHJvbGxlcjogJ1F1aXp6Q3RybCBhcyBRdWl6eidcclxuICAgICAgICB9KS5zdGF0ZSgnNDA0Jywge1xyXG4gICAgICAgICAgICB1cmw6ICcvNDA0JyxcclxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdlcnJvcnMvNDA0Lmh0bWwnXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZShmdW5jdGlvbigkaW5qZWN0b3IpIHtcclxuICAgICAgICB2YXIgJHN0YXRlO1xyXG4gICAgICAgICRzdGF0ZSA9ICRpbmplY3Rvci5nZXQoJyRzdGF0ZScpO1xyXG4gICAgICAgIHJldHVybiAkc3RhdGUuZ28oJzQwNCcsIG51bGwsIHtcclxuICAgICAgICAgICAgbG9jYXRpb246IGZhbHNlXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbn0pXHJcblxyXG4ucnVuKGZ1bmN0aW9uKCRyb290U2NvcGUsICRzdGF0ZSwgJHRpbWVvdXQpIHtcclxuXHJcbiAgICAkcm9vdFNjb3BlLiRzdGF0ZSA9ICRzdGF0ZTtcclxuICAgICRyb290U2NvcGUuTWF0aCA9IE1hdGg7XHJcblxyXG4gICAgJHJvb3RTY29wZS5zYWZlQXBwbHkgPSBmdW5jdGlvbiBzYWZlQXBwbHkob3BlcmF0aW9uKSB7XHJcbiAgICAgICAgdmFyIHBoYXNlID0gdGhpcy4kcm9vdC4kJHBoYXNlO1xyXG4gICAgICAgIGlmIChwaGFzZSAhPT0gJyRhcHBseScgJiYgcGhhc2UgIT09ICckZGlnZXN0Jykge1xyXG4gICAgICAgICAgICB0aGlzLiRhcHBseShvcGVyYXRpb24pO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAob3BlcmF0aW9uICYmIHR5cGVvZiBvcGVyYXRpb24gPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgb3BlcmF0aW9uKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbn0pXHJcblxyXG5cclxuLy9Qcm9iYWJseSBzaG91bGQgbW92ZSB0aGlzIGlmIHdlIGdldCBtb3JlIHV0aWwgc2hpdGVcclxuLmZpbHRlcigndGltZScsIGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKG1zLCBwcmVjaXNlKSB7XHJcblxyXG4gICAgICAgIHZhciB0b3RhbFNlY29uZHMgPSBtcyAvIDEwMDA7XHJcblxyXG4gICAgICAgIHZhciBob3VycyA9IE1hdGguZmxvb3IodG90YWxTZWNvbmRzIC8gMzYwMCk7XHJcbiAgICAgICAgdmFyIG1pbnV0ZXMgPSBNYXRoLmZsb29yKHRvdGFsU2Vjb25kcyAlIDM2MDAgLyA2MCk7XHJcbiAgICAgICAgdmFyIHNlY29uZHMgPSBNYXRoLmZsb29yKHRvdGFsU2Vjb25kcyAlIDYwKTtcclxuICAgICAgICB2YXIgbWlsbGlzZWNvbmRzID0gTWF0aC5mbG9vcihtcyAlIDEwMDApO1xyXG5cclxuICAgICAgICB2YXIgcmV0O1xyXG4gICAgICAgIHJldCA9IGhvdXJzID8gaG91cnMgKyBcIjpcIiA6IFwiXCI7XHJcbiAgICAgICAgcmV0ICs9IChtaW51dGVzIHx8IGhvdXJzKSB8fCAhcHJlY2lzZSA/IChtaW51dGVzIDwgMTAgPyAnMCcgKyBtaW51dGVzIDogbWludXRlcykgKyBcIjpcIiA6IFwiXCI7XHJcbiAgICAgICAgcmV0ICs9IHNlY29uZHMgPCAxMCAmJiAhcHJlY2lzZSA/ICcwJyArIHNlY29uZHMgOiBzZWNvbmRzO1xyXG4gICAgICAgIHJldCArPSBwcmVjaXNlID8gJy4nICsgKG1pbGxpc2Vjb25kcyA8IDEwID8gJzAwJyArIG1pbGxpc2Vjb25kcyA6IChtaWxsaXNlY29uZHMgPCAxMDAgPyAnMCcgKyBtaWxsaXNlY29uZHMgOiBtaWxsaXNlY29uZHMpKSA6IFwiXCI7XHJcblxyXG4gICAgICAgIHJldHVybiByZXQ7XHJcbiAgICB9O1xyXG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJylcclxuICAgIC5jb250cm9sbGVyKCdRdWl6ekN0cmwnLCBmdW5jdGlvbigkcm9vdFNjb3BlLCAkc3RhdGUsIEFwaSwgJHRpbWVvdXQpIHtcclxuXHJcbiAgICAgICAgdmFyIHNjb3BlID0gdGhpcztcclxuICAgICAgICBzY29wZS5sb2FkaW5nID0gdHJ1ZTtcclxuICAgICAgICBzY29wZS50aW1lciA9IDA7IC8vIGluIE1TXHJcblxyXG4gICAgICAgIHNjb3BlLmNsaXBPcHRpb25zID0ge307XHJcblxyXG4gICAgICAgIHNjb3BlLmNsaXBzID0gW3tcclxuICAgICAgICAgICAgdGl0bGU6IFwiTVVUIE1VVCDDiUNBUlRFWi1WT1VTIChFdXJvIFRydWNrIFNpbXVsYXRvciAyKVwiLFxyXG4gICAgICAgICAgICB2aWRlb19pZDogJ0FEVUo4N1d4eXA0JyxcclxuICAgICAgICAgICAgdGh1bWJuYWlsOiAnaHR0cHM6Ly9pLnl0aW1nLmNvbS92aS9BRFVKODdXeHlwNC9tcWRlZmF1bHQuanBnJyxcclxuICAgICAgICAgICAgc3RhcnRfdGltZTogMTgxMjg1LFxyXG4gICAgICAgICAgICBkdXJhdGlvbjogMTkxNzJcclxuICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgIHRpdGxlOiBcIkVUIE1BSU5URU5BTlQsIEZFUk1FIFRBIEdVRVVMRSAoRGF5WilcIixcclxuICAgICAgICAgICAgdmlkZW9faWQ6ICc4MGpEcGRoNHdCYycsXHJcbiAgICAgICAgICAgIHRodW1ibmFpbDogJ2h0dHBzOi8vaS55dGltZy5jb20vdmkvODBqRHBkaDR3QmMvbXFkZWZhdWx0LmpwZycsXHJcbiAgICAgICAgICAgIHN0YXJ0X3RpbWU6IDQ2NjE0NSxcclxuICAgICAgICAgICAgZHVyYXRpb246IDE4NjgxXHJcbiAgICAgICAgfSwge1xyXG4gICAgICAgICAgICB0aXRsZTogXCJKJ0FQUFJFTkRSRSBMQSBTVVJWSUUgRVQgTEEgQ09OSlVHQUlTT04gKEgxWjEgQmF0dGxlIFJveWFsZSlcIixcclxuICAgICAgICAgICAgdmlkZW9faWQ6ICctLTZFUWVKcWY4RScsXHJcbiAgICAgICAgICAgIHRodW1ibmFpbDogJ2h0dHBzOi8vaS55dGltZy5jb20vdmkvLS02RVFlSnFmOEUvbXFkZWZhdWx0LmpwZycsXHJcbiAgICAgICAgICAgIHN0YXJ0X3RpbWU6IDQ1MDU5MyxcclxuICAgICAgICAgICAgZHVyYXRpb246IDIzMTYwXHJcbiAgICAgICAgfSwge1xyXG4gICAgICAgICAgICB0aXRsZTogXCJKJ0FQUFJFTkRSRSBMQSBTVVJWSUUgRVQgTEEgQ09OSlVHQUlTT04gKEgxWjEgQmF0dGxlIFJveWFsZSlcIixcclxuICAgICAgICAgICAgdmlkZW9faWQ6ICctLTZFUWVKcWY4RScsXHJcbiAgICAgICAgICAgIHRodW1ibmFpbDogJ2h0dHBzOi8vaS55dGltZy5jb20vdmkvLS02RVFlSnFmOEUvbXFkZWZhdWx0LmpwZycsXHJcbiAgICAgICAgICAgIHN0YXJ0X3RpbWU6IDQzNTE3MCxcclxuICAgICAgICAgICAgZHVyYXRpb246IDE0ODMwXHJcbiAgICAgICAgfSwge1xyXG4gICAgICAgICAgICB0aXRsZTogXCJFVCBKJ0FJIENSQU3DiSAoSGFsZi1MaWZlIDIgZW4gQ09PUClcIixcclxuICAgICAgICAgICAgdmlkZW9faWQ6ICdpLUVMUk1PM3ZIUScsXHJcbiAgICAgICAgICAgIHRodW1ibmFpbDogJ2h0dHBzOi8vaS55dGltZy5jb20vdmkvaS1FTFJNTzN2SFEvbXFkZWZhdWx0LmpwZycsXHJcbiAgICAgICAgICAgIHN0YXJ0X3RpbWU6IDcwMTQ4MyxcclxuICAgICAgICAgICAgZHVyYXRpb246IDUwMDBcclxuICAgICAgICB9XTtcclxuXHJcbiAgICAgICAgc2NvcGUuYWN0dWFsUG9zaXRpb24gPSAwO1xyXG5cclxuICAgICAgICBzY29wZS52aWRlb3MgPSBbXTtcclxuXHJcbiAgICAgICAgc2NvcGUuYW5zd2VycyA9IFtdO1xyXG5cclxuICAgICAgICBzY29wZS5pbml0Q2xpcCA9IGZ1bmN0aW9uKHBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgIGNsaXAgPSBzY29wZS5jbGlwc1twb3NpdGlvbl07XHJcbiAgICAgICAgICAgIHNjb3BlLmNsaXBPcHRpb25zID0gY2xpcDtcclxuICAgICAgICAgICAgc2NvcGUuYWN0dWFsUG9zaXRpb24gPSBwb3NpdGlvbjtcclxuICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnY2xpcENoYW5nZWQnLCBjbGlwKTtcclxuICAgICAgICAgICAgc2NvcGUuZ2V0QW5zd2VycygpO1xyXG4gICAgICAgICAgICBzY29wZS5yZXNldFRpbWVyKCk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcblxyXG4gICAgICAgIHNjb3BlLm5leHRDbGlwID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIGFjdHVhbFBvc2l0aW9uID0gc2NvcGUuYWN0dWFsUG9zaXRpb247XHJcbiAgICAgICAgICAgIGlmIChhY3R1YWxQb3NpdGlvbiArIDEgPCA1KSB7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5pbml0Q2xpcChhY3R1YWxQb3NpdGlvbiArIDEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5nZXRWaWRlb3MgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgQXBpLmNhbGwoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20veW91dHViZS92My9zZWFyY2g/a2V5PUFJemFTeUJNRHJWaG1pUjJBdjNjQmZtMl9STTdYVnZENnVkTHd1byZjaGFubmVsSWQ9VUNZR2p4bzVpZnVobm12aFB2Q2MzREpRJnBhcnQ9c25pcHBldCZvcmRlcj1kYXRlJm1heFJlc3VsdHM9NTAmdHlwZT12aWRlbycsXHJcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKHJlcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnZpZGVvcyA9IHJlcy5pdGVtcztcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5nZXRBbnN3ZXJzKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5kZWxldGVBbnN3ZXJzID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLmFuc3dlcnMgPSBbXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLnJhbmRvbWl6ZVZpZGVvcyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBzY29wZS52aWRlb3MgPSBzY29wZS5zaHVmZmxlKHNjb3BlLnZpZGVvcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5zaHVmZmxlID0gZnVuY3Rpb24oYSkge1xyXG4gICAgICAgICAgICB2YXIgaiwgeCwgaTtcclxuICAgICAgICAgICAgZm9yIChpID0gYS5sZW5ndGg7IGk7IGktLSkge1xyXG4gICAgICAgICAgICAgICAgaiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGkpO1xyXG4gICAgICAgICAgICAgICAgeCA9IGFbaSAtIDFdO1xyXG4gICAgICAgICAgICAgICAgYVtpIC0gMV0gPSBhW2pdO1xyXG4gICAgICAgICAgICAgICAgYVtqXSA9IHg7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGE7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5nZXRBbnN3ZXJzID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLnJhbmRvbWl6ZVZpZGVvcygpO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDM7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgc2NvcGUuYW5zd2Vyc1tpXSA9IHNjb3BlLnZpZGVvc1tpXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzY29wZS5hbnN3ZXJzWzNdID0ge1xyXG4gICAgICAgICAgICAgICAgaWQ6IHtcclxuICAgICAgICAgICAgICAgICAgICB2aWRlb0lkOiBzY29wZS5jbGlwc1tzY29wZS5hY3R1YWxQb3NpdGlvbl0udmlkZW9faWRcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBzbmlwcGV0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6IHNjb3BlLmNsaXBzW3Njb3BlLmFjdHVhbFBvc2l0aW9uXS50aXRsZSxcclxuICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWxzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lZGl1bToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiBzY29wZS5jbGlwc1tzY29wZS5hY3R1YWxQb3NpdGlvbl0udGh1bWJuYWlsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2NvcGUuYW5zd2VycyA9IHNjb3BlLnNodWZmbGUoc2NvcGUuYW5zd2Vycyk7XHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhzY29wZS5hbnN3ZXJzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLmFuc3dlciA9IGZ1bmN0aW9uKGEpIHtcclxuICAgICAgICAgICAgY3VycmVudF9jbGlwX2lkID0gc2NvcGUuY2xpcHNbc2NvcGUuYWN0dWFsUG9zaXRpb25dLnZpZGVvX2lkO1xyXG4gICAgICAgICAgICBpZiAoY3VycmVudF9jbGlwX2lkID09IGEpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwid2luXCIpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2xvbCcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKDMwMDAgLSBzY29wZS50aW1lcik7XHJcbiAgICAgICAgICAgIHNjb3BlLm5leHRDbGlwKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAkcm9vdFNjb3BlLiRvbignY2xpcFN0YXJ0ZWQnLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZTpjbGlwU3RhcnRlZFwiKTtcclxuICAgICAgICAgICAgc2NvcGUuc3RhcnRUaW1lcigpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBzY29wZS5zdGFydFRpbWVyID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLnRpbWVyID0gMDtcclxuICAgICAgICAgICAgc2NvcGUudGltZXJUaW1lb3V0ID0gJHRpbWVvdXQoc2NvcGUub25UaW1lb3V0LCAxMCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5yZXNldFRpbWVyID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLnN0b3BUaW1lcigpO1xyXG4gICAgICAgICAgICBzY29wZS50aW1lciA9IDA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5vblRpbWVvdXQgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUudGltZXIrKztcclxuICAgICAgICAgICAgc2NvcGUudGltZXJUaW1lb3V0ID0gJHRpbWVvdXQoc2NvcGUub25UaW1lb3V0LCAxMCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5zdG9wVGltZXIgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKHNjb3BlLnRpbWVyVGltZW91dCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5pbml0Q2xpcCgwKTtcclxuICAgICAgICBzY29wZS5nZXRWaWRlb3MoKTtcclxuXHJcblxyXG4gICAgfSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpXHJcbiAgICAuZGlyZWN0aXZlKCdwbGF5ZXInLCBmdW5jdGlvbihBcGksICR0aW1lb3V0LCAkaW50ZXJ2YWwpIHtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdkaXJlY3RpdmVzL3BsYXllci5odG1sJyxcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIC8vc25pcDogICAgXCI9c25pcFwiLFxyXG4gICAgICAgICAgICAgICAgY2xpcDogXCI9Y2xpcFwiXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ1BsYXllcicsXHJcbiAgICAgICAgICAgIGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsXHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgJGVsZW1lbnQsICRyb290U2NvcGUpIHtcclxuICAgICAgICAgICAgICAgIHZhciBzY29wZSA9IHRoaXM7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIHBsYXllciwgcmVzdGFydFRpbWVyLCBsb29wU3RhcnRlZCwgaW5pdEludGVydmFsO1xyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGxvb3AoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2xvb3Agc3RhcnRlZCA6IHN0ID0gJyArIHNjb3BlLmNsaXAuc3RhcnRfdGltZSArICcgfCBkdXJhdGlvbiA9ICcgKyBzY29wZS5jbGlwLmR1cmF0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIuc2Vla1RvKHNjb3BlLmNsaXAuc3RhcnRfdGltZSAvIDEwMDAsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHBsYXllci5wbGF5VmlkZW8oKTtcclxuICAgICAgICAgICAgICAgICAgICByZXN0YXJ0VGltZXIgPSAkdGltZW91dChsb29wLCBzY29wZS5jbGlwLmR1cmF0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBpbml0WW91dHViZSgpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnaW5pdFlvdXR1YmUnKTtcclxuICAgICAgICAgICAgICAgICAgICBsb29wU3RhcnRlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIHBsYXllciA9IG5ldyBZVC5QbGF5ZXIoJ3l0cGxheWVyJywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6ICc0MDAnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogJzEwMCUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwbGF5ZXJWYXJzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sczogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vYXV0b2hpZGU6ICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdXRvcGxheTogMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVrYjogMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWpzYXBpOiAxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnM6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2Rlc3RicmFuZGluZzogMSwgLy9vbmx5IHdvcmtzIHdpdGggY29udHJvbHMgZW5hYmxlZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxheXNpbmxpbmU6IDEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaG93aW5mbzogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbDogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZW1lOiAnZGFyaycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvSWQ6IHNjb3BlLmNsaXAudmlkZW9faWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50czoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ29uUmVhZHknOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZTp5dHBsYXllcjpvblJlYWR5Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9TY2FsZSBwbGF5ZXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29udGFpbmVyV2lkdGggPSAkZWxlbWVudFswXS5jbGllbnRXaWR0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGF5ZXIuZ2V0SWZyYW1lKCkud2lkdGggPSBjb250YWluZXJXaWR0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGF5ZXIuZ2V0SWZyYW1lKCkuaGVpZ2h0ID0gY29udGFpbmVyV2lkdGggKiAwLjU2MjU7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYXllci5zZWVrVG8oc2NvcGUuY2xpcC5zdGFydF90aW1lIC8gMTAwMCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9wbGF5ZXIucGxheVZpZGVvKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ29uU3RhdGVDaGFuZ2UnOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGxheWVyLmdldFBsYXllclN0YXRlKCkgPT0gMSAmJiAhbG9vcFN0YXJ0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnY2xpcFN0YXJ0ZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9vcFN0YXJ0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb29wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaW5pdEludGVydmFsID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChZVCAmJiBZVC5QbGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGludGVydmFsLmNhbmNlbChpbml0SW50ZXJ2YWwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbml0WW91dHViZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sIDI1KTtcclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBjaGFuZ2VDbGlwKGNsaXApIHtcclxuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIuZGVzdHJveSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmNsaXAgPSBjbGlwO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHNjb3BlLmNsaXApO1xyXG4gICAgICAgICAgICAgICAgICAgIGluaXRZb3V0dWJlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZTokZGVzdHJveScpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIucGF1c2VWaWRlbygpO1xyXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChyZXN0YXJ0VGltZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwoaW5pdEludGVydmFsKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRvbignY2xpcENoYW5nZWQnLCBmdW5jdGlvbihlLCBjKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlQ2xpcChjKVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICB9KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJykuc2VydmljZSgnQXBpJywgZnVuY3Rpb24oJGh0dHAsICRxLCBDb25maWcsICR0aW1lb3V0KSB7XHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUGVyZm9ybSBhbiBBUEkgY2FsbC5cclxuICAgICAqIEBwYXJhbSBvcHRpb25zIHt1cmwsIHBhcmFtcywgZGF0YSwgY2FsbGJhY2ssIG1ldGhvZCwgZXJyb3JIYW5kbGVyIChzaG91bGQgcmV0dXJuIHRydWUpLCB0aW1lb3V0IGluIE1TLCBibG9ja1VJfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmNhbGwgPSBmdW5jdGlvbihvcHRpb25zKSB7XHJcblxyXG4gICAgICAgIHZhciBvcHRpb25zID0gYW5ndWxhci5leHRlbmQoe1xyXG4gICAgICAgICAgICB1cmw6IG51bGwsXHJcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXHJcbiAgICAgICAgICAgIHBhcmFtczogbnVsbCxcclxuICAgICAgICAgICAgZGF0YTogbnVsbCxcclxuICAgICAgICAgICAgY2FsbGJhY2s6IG51bGwsXHJcbiAgICAgICAgICAgIHRpbWVvdXQ6IDMwMDAwLFxyXG4gICAgICAgICAgICBlcnJvckhhbmRsZXI6IG51bGwsXHJcbiAgICAgICAgICAgIGJsb2NrVUk6IHRydWUsXHJcbiAgICAgICAgfSwgb3B0aW9ucyk7XHJcblxyXG4gICAgICAgIHZhciBjYW5jZWxlciA9ICRxLmRlZmVyKCk7XHJcbiAgICAgICAgdmFyIGNhbmNlbFRpbWVvdXQgPSBvcHRpb25zLnRpbWVvdXQgPyAkdGltZW91dChjYW5jZWxlci5yZXNvbHZlLCBvcHRpb25zLnRpbWVvdXQpIDogbnVsbDtcclxuXHJcblxyXG4gICAgICAgIHZhciB1cmwgPSBvcHRpb25zLnVybC5pbmRleE9mKCdodHRwJykgPT0gMCA/IG9wdGlvbnMudXJsIDogQ29uZmlnLmFwaUJhc2UgKyBvcHRpb25zLnVybDtcclxuXHJcbiAgICAgICAgJGh0dHAoe1xyXG4gICAgICAgICAgICB1cmw6IHVybCxcclxuICAgICAgICAgICAgbWV0aG9kOiBvcHRpb25zLm1ldGhvZCxcclxuICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyxcclxuICAgICAgICAgICAgZGF0YTogb3B0aW9ucy5kYXRhLFxyXG4gICAgICAgICAgICB0aW1lb3V0OiBjYW5jZWxlci5wcm9taXNlXHJcbiAgICAgICAgfSkuc3VjY2VzcyhmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChjYW5jZWxUaW1lb3V0KTtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmNhbGxiYWNrID09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgIG9wdGlvbnMuY2FsbGJhY2soZGF0YSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KS5lcnJvcihmdW5jdGlvbihtZXNzYWdlLCBzdGF0dXMpIHtcclxuICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKGNhbmNlbFRpbWVvdXQpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmVycm9ySGFuZGxlciA9PSAnZnVuY3Rpb24nICYmIG9wdGlvbnMuZXJyb3JIYW5kbGVyKG1lc3NhZ2UsIHN0YXR1cykpIHtcclxuICAgICAgICAgICAgICAgIC8vRXJyb3Igd2FzIGhhbmRsZWQgYnkgdGhlIGN1c3RvbSBlcnJvciBoYW5kbGVyXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghc3RhdHVzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkVycm9yIHdpdGhvdXQgc3RhdHVzOyByZXF1ZXN0IGFib3J0ZWQ/XCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBjYW5jZWw6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgY2FuY2VsZXIucmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICB9O1xyXG5cclxufSk7Il19
