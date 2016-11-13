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
                    $timeout.cancel(restartTimer);
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbnRyb2xsZXIvcXVpenouanMiLCJkaXJlY3RpdmVzL3BsYXllci5qcyIsInNlcnZpY2UvYXBpLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJhbmd1bGFyLm1vZHVsZSgnQXBwJywgWyd0ZW1wbGF0ZXMnLCAndWkucm91dGVyJywgJ25nQW5pbWF0ZScsICduZ1JvdXRlJywgJ2FuZ3VsYXJNb21lbnQnXSlcclxuXHJcbi5jb25zdGFudCgnQ29uZmlnJywge1xyXG4gICAgYXBpQmFzZTogd2luZG93LmxvY2F0aW9uLnByb3RvY29sICsgXCIvL1wiICsgd2luZG93LmxvY2F0aW9uLmhvc3QgKyBcIi9hcGkvXCJcclxufSlcclxuXHJcbi5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIsICR1cmxSb3V0ZXJQcm92aWRlciwgJHNjZVByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlcikge1xyXG5cclxuICAgICRzY2VQcm92aWRlci5lbmFibGVkKGZhbHNlKTtcclxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcclxuXHJcbiAgICAkc3RhdGVQcm92aWRlclxyXG4gICAgICAgIC5zdGF0ZSgncXVpenonLCB7XHJcbiAgICAgICAgICAgIHVybDogJy8nLFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ3F1aXp6L2luZGV4Lmh0bWwnLFxyXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnUXVpenpDdHJsIGFzIFF1aXp6J1xyXG4gICAgICAgIH0pLnN0YXRlKCc0MDQnLCB7XHJcbiAgICAgICAgICAgIHVybDogJy80MDQnLFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2Vycm9ycy80MDQuaHRtbCdcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKGZ1bmN0aW9uKCRpbmplY3Rvcikge1xyXG4gICAgICAgIHZhciAkc3RhdGU7XHJcbiAgICAgICAgJHN0YXRlID0gJGluamVjdG9yLmdldCgnJHN0YXRlJyk7XHJcbiAgICAgICAgcmV0dXJuICRzdGF0ZS5nbygnNDA0JywgbnVsbCwge1xyXG4gICAgICAgICAgICBsb2NhdGlvbjogZmFsc2VcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxufSlcclxuXHJcbi5ydW4oZnVuY3Rpb24oJHJvb3RTY29wZSwgJHN0YXRlLCAkdGltZW91dCkge1xyXG5cclxuICAgICRyb290U2NvcGUuJHN0YXRlID0gJHN0YXRlO1xyXG4gICAgJHJvb3RTY29wZS5NYXRoID0gTWF0aDtcclxuXHJcbiAgICAkcm9vdFNjb3BlLnNhZmVBcHBseSA9IGZ1bmN0aW9uIHNhZmVBcHBseShvcGVyYXRpb24pIHtcclxuICAgICAgICB2YXIgcGhhc2UgPSB0aGlzLiRyb290LiQkcGhhc2U7XHJcbiAgICAgICAgaWYgKHBoYXNlICE9PSAnJGFwcGx5JyAmJiBwaGFzZSAhPT0gJyRkaWdlc3QnKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGFwcGx5KG9wZXJhdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChvcGVyYXRpb24gJiYgdHlwZW9mIG9wZXJhdGlvbiA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICBvcGVyYXRpb24oKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxufSlcclxuXHJcblxyXG4vL1Byb2JhYmx5IHNob3VsZCBtb3ZlIHRoaXMgaWYgd2UgZ2V0IG1vcmUgdXRpbCBzaGl0ZVxyXG4uZmlsdGVyKCd0aW1lJywgZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24obXMsIHByZWNpc2UpIHtcclxuXHJcbiAgICAgICAgdmFyIHRvdGFsU2Vjb25kcyA9IG1zIC8gMTAwMDtcclxuXHJcbiAgICAgICAgdmFyIGhvdXJzID0gTWF0aC5mbG9vcih0b3RhbFNlY29uZHMgLyAzNjAwKTtcclxuICAgICAgICB2YXIgbWludXRlcyA9IE1hdGguZmxvb3IodG90YWxTZWNvbmRzICUgMzYwMCAvIDYwKTtcclxuICAgICAgICB2YXIgc2Vjb25kcyA9IE1hdGguZmxvb3IodG90YWxTZWNvbmRzICUgNjApO1xyXG4gICAgICAgIHZhciBtaWxsaXNlY29uZHMgPSBNYXRoLmZsb29yKG1zICUgMTAwMCk7XHJcblxyXG4gICAgICAgIHZhciByZXQ7XHJcbiAgICAgICAgcmV0ID0gaG91cnMgPyBob3VycyArIFwiOlwiIDogXCJcIjtcclxuICAgICAgICByZXQgKz0gKG1pbnV0ZXMgfHwgaG91cnMpIHx8ICFwcmVjaXNlID8gKG1pbnV0ZXMgPCAxMCA/ICcwJyArIG1pbnV0ZXMgOiBtaW51dGVzKSArIFwiOlwiIDogXCJcIjtcclxuICAgICAgICByZXQgKz0gc2Vjb25kcyA8IDEwICYmICFwcmVjaXNlID8gJzAnICsgc2Vjb25kcyA6IHNlY29uZHM7XHJcbiAgICAgICAgcmV0ICs9IHByZWNpc2UgPyAnLicgKyAobWlsbGlzZWNvbmRzIDwgMTAgPyAnMDAnICsgbWlsbGlzZWNvbmRzIDogKG1pbGxpc2Vjb25kcyA8IDEwMCA/ICcwJyArIG1pbGxpc2Vjb25kcyA6IG1pbGxpc2Vjb25kcykpIDogXCJcIjtcclxuXHJcbiAgICAgICAgcmV0dXJuIHJldDtcclxuICAgIH07XHJcbn0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKVxyXG4gICAgLmNvbnRyb2xsZXIoJ1F1aXp6Q3RybCcsIGZ1bmN0aW9uKCRyb290U2NvcGUsICRzdGF0ZSwgQXBpLCAkdGltZW91dCkge1xyXG5cclxuICAgICAgICB2YXIgc2NvcGUgPSB0aGlzO1xyXG4gICAgICAgIHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xyXG4gICAgICAgIHNjb3BlLnRpbWVyID0gMDsgLy8gaW4gTVNcclxuXHJcbiAgICAgICAgc2NvcGUuY2xpcE9wdGlvbnMgPSB7fTtcclxuXHJcbiAgICAgICAgc2NvcGUuY2xpcHMgPSBbe1xyXG4gICAgICAgICAgICB0aXRsZTogXCJNVVQgTVVUIMOJQ0FSVEVaLVZPVVMgKEV1cm8gVHJ1Y2sgU2ltdWxhdG9yIDIpXCIsXHJcbiAgICAgICAgICAgIHZpZGVvX2lkOiAnQURVSjg3V3h5cDQnLFxyXG4gICAgICAgICAgICB0aHVtYm5haWw6ICdodHRwczovL2kueXRpbWcuY29tL3ZpL0FEVUo4N1d4eXA0L21xZGVmYXVsdC5qcGcnLFxyXG4gICAgICAgICAgICBzdGFydF90aW1lOiAxODEyODUsXHJcbiAgICAgICAgICAgIGR1cmF0aW9uOiAxOTE3MlxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgICAgdGl0bGU6IFwiRVQgTUFJTlRFTkFOVCwgRkVSTUUgVEEgR1VFVUxFIChEYXlaKVwiLFxyXG4gICAgICAgICAgICB2aWRlb19pZDogJzgwakRwZGg0d0JjJyxcclxuICAgICAgICAgICAgdGh1bWJuYWlsOiAnaHR0cHM6Ly9pLnl0aW1nLmNvbS92aS84MGpEcGRoNHdCYy9tcWRlZmF1bHQuanBnJyxcclxuICAgICAgICAgICAgc3RhcnRfdGltZTogNDY2MTQ1LFxyXG4gICAgICAgICAgICBkdXJhdGlvbjogMTg2ODFcclxuICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgIHRpdGxlOiBcIkonQVBQUkVORFJFIExBIFNVUlZJRSBFVCBMQSBDT05KVUdBSVNPTiAoSDFaMSBCYXR0bGUgUm95YWxlKVwiLFxyXG4gICAgICAgICAgICB2aWRlb19pZDogJy0tNkVRZUpxZjhFJyxcclxuICAgICAgICAgICAgdGh1bWJuYWlsOiAnaHR0cHM6Ly9pLnl0aW1nLmNvbS92aS8tLTZFUWVKcWY4RS9tcWRlZmF1bHQuanBnJyxcclxuICAgICAgICAgICAgc3RhcnRfdGltZTogNDUwNTkzLFxyXG4gICAgICAgICAgICBkdXJhdGlvbjogMjMxNjBcclxuICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgIHRpdGxlOiBcIkonQVBQUkVORFJFIExBIFNVUlZJRSBFVCBMQSBDT05KVUdBSVNPTiAoSDFaMSBCYXR0bGUgUm95YWxlKVwiLFxyXG4gICAgICAgICAgICB2aWRlb19pZDogJy0tNkVRZUpxZjhFJyxcclxuICAgICAgICAgICAgdGh1bWJuYWlsOiAnaHR0cHM6Ly9pLnl0aW1nLmNvbS92aS8tLTZFUWVKcWY4RS9tcWRlZmF1bHQuanBnJyxcclxuICAgICAgICAgICAgc3RhcnRfdGltZTogNDM1MTcwLFxyXG4gICAgICAgICAgICBkdXJhdGlvbjogMTQ4MzBcclxuICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgIHRpdGxlOiBcIkVUIEonQUkgQ1JBTcOJIChIYWxmLUxpZmUgMiBlbiBDT09QKVwiLFxyXG4gICAgICAgICAgICB2aWRlb19pZDogJ2ktRUxSTU8zdkhRJyxcclxuICAgICAgICAgICAgdGh1bWJuYWlsOiAnaHR0cHM6Ly9pLnl0aW1nLmNvbS92aS9pLUVMUk1PM3ZIUS9tcWRlZmF1bHQuanBnJyxcclxuICAgICAgICAgICAgc3RhcnRfdGltZTogNzAxNDgzLFxyXG4gICAgICAgICAgICBkdXJhdGlvbjogNTAwMFxyXG4gICAgICAgIH1dO1xyXG5cclxuICAgICAgICBzY29wZS5hY3R1YWxQb3NpdGlvbiA9IDA7XHJcblxyXG4gICAgICAgIHNjb3BlLnZpZGVvcyA9IFtdO1xyXG5cclxuICAgICAgICBzY29wZS5hbnN3ZXJzID0gW107XHJcblxyXG4gICAgICAgIHNjb3BlLmluaXRDbGlwID0gZnVuY3Rpb24ocG9zaXRpb24pIHtcclxuICAgICAgICAgICAgY2xpcCA9IHNjb3BlLmNsaXBzW3Bvc2l0aW9uXTtcclxuICAgICAgICAgICAgc2NvcGUuY2xpcE9wdGlvbnMgPSBjbGlwO1xyXG4gICAgICAgICAgICBzY29wZS5hY3R1YWxQb3NpdGlvbiA9IHBvc2l0aW9uO1xyXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCdjbGlwQ2hhbmdlZCcsIGNsaXApO1xyXG4gICAgICAgICAgICBzY29wZS5nZXRBbnN3ZXJzKCk7XHJcbiAgICAgICAgICAgIHNjb3BlLnJlc2V0VGltZXIoKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgc2NvcGUubmV4dENsaXAgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgYWN0dWFsUG9zaXRpb24gPSBzY29wZS5hY3R1YWxQb3NpdGlvbjtcclxuICAgICAgICAgICAgaWYgKGFjdHVhbFBvc2l0aW9uICsgMSA8IDUpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLmluaXRDbGlwKGFjdHVhbFBvc2l0aW9uICsgMSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLmdldFZpZGVvcyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBBcGkuY2FsbCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICdodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS95b3V0dWJlL3YzL3NlYXJjaD9rZXk9QUl6YVN5Qk1EclZobWlSMkF2M2NCZm0yX1JNN1hWdkQ2dWRMd3VvJmNoYW5uZWxJZD1VQ1lHanhvNWlmdWhubXZoUHZDYzNESlEmcGFydD1zbmlwcGV0Jm9yZGVyPWRhdGUmbWF4UmVzdWx0cz01MCZ0eXBlPXZpZGVvJyxcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24ocmVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudmlkZW9zID0gcmVzLml0ZW1zO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmdldEFuc3dlcnMoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLmRlbGV0ZUFuc3dlcnMgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUuYW5zd2VycyA9IFtdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUucmFuZG9taXplVmlkZW9zID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLnZpZGVvcyA9IHNjb3BlLnNodWZmbGUoc2NvcGUudmlkZW9zKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLnNodWZmbGUgPSBmdW5jdGlvbihhKSB7XHJcbiAgICAgICAgICAgIHZhciBqLCB4LCBpO1xyXG4gICAgICAgICAgICBmb3IgKGkgPSBhLmxlbmd0aDsgaTsgaS0tKSB7XHJcbiAgICAgICAgICAgICAgICBqID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogaSk7XHJcbiAgICAgICAgICAgICAgICB4ID0gYVtpIC0gMV07XHJcbiAgICAgICAgICAgICAgICBhW2kgLSAxXSA9IGFbal07XHJcbiAgICAgICAgICAgICAgICBhW2pdID0geDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gYTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLmdldEFuc3dlcnMgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUucmFuZG9taXplVmlkZW9zKCk7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMzsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5hbnN3ZXJzW2ldID0gc2NvcGUudmlkZW9zW2ldO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNjb3BlLmFuc3dlcnNbM10gPSB7XHJcbiAgICAgICAgICAgICAgICBpZDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHZpZGVvSWQ6IHNjb3BlLmNsaXBzW3Njb3BlLmFjdHVhbFBvc2l0aW9uXS52aWRlb19pZFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHNuaXBwZXQ6IHtcclxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogc2NvcGUuY2xpcHNbc2NvcGUuYWN0dWFsUG9zaXRpb25dLnRpdGxlLFxyXG4gICAgICAgICAgICAgICAgICAgIHRodW1ibmFpbHM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWVkaXVtOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6IHNjb3BlLmNsaXBzW3Njb3BlLmFjdHVhbFBvc2l0aW9uXS50aHVtYm5haWxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzY29wZS5hbnN3ZXJzID0gc2NvcGUuc2h1ZmZsZShzY29wZS5hbnN3ZXJzKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHNjb3BlLmFuc3dlcnMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUuYW5zd2VyID0gZnVuY3Rpb24oYSkge1xyXG4gICAgICAgICAgICBjdXJyZW50X2NsaXBfaWQgPSBzY29wZS5jbGlwc1tzY29wZS5hY3R1YWxQb3NpdGlvbl0udmlkZW9faWQ7XHJcbiAgICAgICAgICAgIGlmIChjdXJyZW50X2NsaXBfaWQgPT0gYSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ3aW5cIik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbG9sJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc29sZS5sb2coMzAwMCAtIHNjb3BlLnRpbWVyKTtcclxuICAgICAgICAgICAgc2NvcGUubmV4dENsaXAoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgICRyb290U2NvcGUuJG9uKCdjbGlwU3RhcnRlZCcsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJlOmNsaXBTdGFydGVkXCIpO1xyXG4gICAgICAgICAgICBzY29wZS5zdGFydFRpbWVyKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHNjb3BlLnN0YXJ0VGltZXIgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUudGltZXIgPSAwO1xyXG4gICAgICAgICAgICBzY29wZS50aW1lclRpbWVvdXQgPSAkdGltZW91dChzY29wZS5vblRpbWVvdXQsIDEwKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLnJlc2V0VGltZXIgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUuc3RvcFRpbWVyKCk7XHJcbiAgICAgICAgICAgIHNjb3BlLnRpbWVyID0gMDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLm9uVGltZW91dCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBzY29wZS50aW1lcisrO1xyXG4gICAgICAgICAgICBzY29wZS50aW1lclRpbWVvdXQgPSAkdGltZW91dChzY29wZS5vblRpbWVvdXQsIDEwKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLnN0b3BUaW1lciA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAkdGltZW91dC5jYW5jZWwoc2NvcGUudGltZXJUaW1lb3V0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLmluaXRDbGlwKDApO1xyXG4gICAgICAgIHNjb3BlLmdldFZpZGVvcygpO1xyXG5cclxuXHJcbiAgICB9KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJylcclxuICAgIC5kaXJlY3RpdmUoJ3BsYXllcicsIGZ1bmN0aW9uKEFwaSwgJHRpbWVvdXQsICRpbnRlcnZhbCkge1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2RpcmVjdGl2ZXMvcGxheWVyLmh0bWwnLFxyXG4gICAgICAgICAgICBzY29wZToge1xyXG4gICAgICAgICAgICAgICAgLy9zbmlwOiAgICBcIj1zbmlwXCIsXHJcbiAgICAgICAgICAgICAgICBjbGlwOiBcIj1jbGlwXCJcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAnUGxheWVyJyxcclxuICAgICAgICAgICAgYmluZFRvQ29udHJvbGxlcjogdHJ1ZSxcclxuICAgICAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCAkZWxlbWVudCwgJHJvb3RTY29wZSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHNjb3BlID0gdGhpcztcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgcGxheWVyLCByZXN0YXJ0VGltZXIsIGxvb3BTdGFydGVkLCBpbml0SW50ZXJ2YWw7XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gbG9vcCgpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbG9vcCBzdGFydGVkIDogc3QgPSAnICsgc2NvcGUuY2xpcC5zdGFydF90aW1lICsgJyB8IGR1cmF0aW9uID0gJyArIHNjb3BlLmNsaXAuZHVyYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIHBsYXllci5zZWVrVG8oc2NvcGUuY2xpcC5zdGFydF90aW1lIC8gMTAwMCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gcGxheWVyLnBsYXlWaWRlbygpO1xyXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChyZXN0YXJ0VGltZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3RhcnRUaW1lciA9ICR0aW1lb3V0KGxvb3AsIHNjb3BlLmNsaXAuZHVyYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGluaXRZb3V0dWJlKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdpbml0WW91dHViZScpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvb3BTdGFydGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgcGxheWVyID0gbmV3IFlULlBsYXllcigneXRwbGF5ZXInLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogJzQwMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiAnMTAwJScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYXllclZhcnM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xzOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9hdXRvaGlkZTogICAgICAgMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF1dG9wbGF5OiAxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWtiOiAxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlanNhcGk6IDEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmczogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZGVzdGJyYW5kaW5nOiAxLCAvL29ubHkgd29ya3Mgd2l0aCBjb250cm9scyBlbmFibGVkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGF5c2lubGluZTogMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNob3dpbmZvOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVsOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlbWU6ICdkYXJrJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9JZDogc2NvcGUuY2xpcC52aWRlb19pZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnb25SZWFkeSc6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdlOnl0cGxheWVyOm9uUmVhZHknKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL1NjYWxlIHBsYXllclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb250YWluZXJXaWR0aCA9ICRlbGVtZW50WzBdLmNsaWVudFdpZHRoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYXllci5nZXRJZnJhbWUoKS53aWR0aCA9IGNvbnRhaW5lcldpZHRoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYXllci5nZXRJZnJhbWUoKS5oZWlnaHQgPSBjb250YWluZXJXaWR0aCAqIDAuNTYyNTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxheWVyLnNlZWtUbyhzY29wZS5jbGlwLnN0YXJ0X3RpbWUgLyAxMDAwLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL3BsYXllci5wbGF5VmlkZW8oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnb25TdGF0ZUNoYW5nZSc6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwbGF5ZXIuZ2V0UGxheWVyU3RhdGUoKSA9PSAxICYmICFsb29wU3RhcnRlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCdjbGlwU3RhcnRlZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb29wU3RhcnRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvb3AoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpbml0SW50ZXJ2YWwgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKFlUICYmIFlULlBsYXllcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKGluaXRJbnRlcnZhbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluaXRZb3V0dWJlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSwgMjUpO1xyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGNoYW5nZUNsaXAoY2xpcCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHBsYXllci5kZXN0cm95KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuY2xpcCA9IGNsaXA7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coc2NvcGUuY2xpcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5pdFlvdXR1YmUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdlOiRkZXN0cm95Jyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHBsYXllci5wYXVzZVZpZGVvKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKHJlc3RhcnRUaW1lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgJGludGVydmFsLmNhbmNlbChpbml0SW50ZXJ2YWwpO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJG9uKCdjbGlwQ2hhbmdlZCcsIGZ1bmN0aW9uKGUsIGMpIHtcclxuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VDbGlwKGMpXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgIH0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKS5zZXJ2aWNlKCdBcGknLCBmdW5jdGlvbigkaHR0cCwgJHEsIENvbmZpZywgJHRpbWVvdXQpIHtcclxuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBQZXJmb3JtIGFuIEFQSSBjYWxsLlxyXG4gICAgICogQHBhcmFtIG9wdGlvbnMge3VybCwgcGFyYW1zLCBkYXRhLCBjYWxsYmFjaywgbWV0aG9kLCBlcnJvckhhbmRsZXIgKHNob3VsZCByZXR1cm4gdHJ1ZSksIHRpbWVvdXQgaW4gTVMsIGJsb2NrVUl9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuY2FsbCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcclxuXHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBhbmd1bGFyLmV4dGVuZCh7XHJcbiAgICAgICAgICAgIHVybDogbnVsbCxcclxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcclxuICAgICAgICAgICAgcGFyYW1zOiBudWxsLFxyXG4gICAgICAgICAgICBkYXRhOiBudWxsLFxyXG4gICAgICAgICAgICBjYWxsYmFjazogbnVsbCxcclxuICAgICAgICAgICAgdGltZW91dDogMzAwMDAsXHJcbiAgICAgICAgICAgIGVycm9ySGFuZGxlcjogbnVsbCxcclxuICAgICAgICAgICAgYmxvY2tVSTogdHJ1ZSxcclxuICAgICAgICB9LCBvcHRpb25zKTtcclxuXHJcbiAgICAgICAgdmFyIGNhbmNlbGVyID0gJHEuZGVmZXIoKTtcclxuICAgICAgICB2YXIgY2FuY2VsVGltZW91dCA9IG9wdGlvbnMudGltZW91dCA/ICR0aW1lb3V0KGNhbmNlbGVyLnJlc29sdmUsIG9wdGlvbnMudGltZW91dCkgOiBudWxsO1xyXG5cclxuXHJcbiAgICAgICAgdmFyIHVybCA9IG9wdGlvbnMudXJsLmluZGV4T2YoJ2h0dHAnKSA9PSAwID8gb3B0aW9ucy51cmwgOiBDb25maWcuYXBpQmFzZSArIG9wdGlvbnMudXJsO1xyXG5cclxuICAgICAgICAkaHR0cCh7XHJcbiAgICAgICAgICAgIHVybDogdXJsLFxyXG4gICAgICAgICAgICBtZXRob2Q6IG9wdGlvbnMubWV0aG9kLFxyXG4gICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zLFxyXG4gICAgICAgICAgICBkYXRhOiBvcHRpb25zLmRhdGEsXHJcbiAgICAgICAgICAgIHRpbWVvdXQ6IGNhbmNlbGVyLnByb21pc2VcclxuICAgICAgICB9KS5zdWNjZXNzKGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKGNhbmNlbFRpbWVvdXQpO1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuY2FsbGJhY2sgPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgb3B0aW9ucy5jYWxsYmFjayhkYXRhKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pLmVycm9yKGZ1bmN0aW9uKG1lc3NhZ2UsIHN0YXR1cykge1xyXG4gICAgICAgICAgICAkdGltZW91dC5jYW5jZWwoY2FuY2VsVGltZW91dCk7XHJcblxyXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuZXJyb3JIYW5kbGVyID09ICdmdW5jdGlvbicgJiYgb3B0aW9ucy5lcnJvckhhbmRsZXIobWVzc2FnZSwgc3RhdHVzKSkge1xyXG4gICAgICAgICAgICAgICAgLy9FcnJvciB3YXMgaGFuZGxlZCBieSB0aGUgY3VzdG9tIGVycm9yIGhhbmRsZXJcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFzdGF0dXMpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3Igd2l0aG91dCBzdGF0dXM7IHJlcXVlc3QgYWJvcnRlZD9cIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGNhbmNlbDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBjYW5jZWxlci5yZXNvbHZlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgIH07XHJcblxyXG59KTsiXX0=
