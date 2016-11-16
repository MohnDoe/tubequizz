angular.module('App', ['templates', 'ui.router', 'ngAnimate', 'ngRoute', 'angularMoment'])

.constant('Config', {
    apiBase: window.location.protocol + "//" + window.location.host + "/api/"
})

.config(function($stateProvider, $urlRouterProvider, $sceProvider, $locationProvider) {

    $sceProvider.enabled(false);
    $locationProvider.html5Mode(true);

    $stateProvider
        .state('level', {
            url: '/level/:channel/{level_id:int}',
            templateUrl: 'level/index.html',
            controller: 'LevelCtrl as Level'
        }).state('quizz', {
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
                scope.player = null;
                var player, restartTimer, loopStarted, initInterval;

                function loop() {
                    console.log('loop started : st = ' + scope.clip.start_time + ' | duration = ' + scope.clip.duration);
                    scope.player.seekTo(scope.clip.start_time / 1000, true);
                    // scope.player.playVideo();
                    $timeout.cancel(restartTimer);
                    restartTimer = $timeout(loop, scope.clip.duration);
                }

                function initYoutube() {
                    // console.log('initYoutube');
                    loopStarted = false;
                    scope.player = new YT.Player('ytplayer', {
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
                            'onReady': function(e) {
                                e.target.setVolume(75);
                                console.log('e:ytplayer:onReady');
                                //Scale player
                                var containerWidth = $element[0].clientWidth;
                                e.target.getIframe().width = containerWidth;
                                e.target.getIframe().height = containerWidth * 0.5625;

                                e.target.seekTo(scope.clip.start_time / 1000, true);
                                //e.target.playVideo();
                            },
                            'onStateChange': function(e) {
                                if (scope.player.getPlayerState() == 1 && !loopStarted) {
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
                    if (scope.player) {
                        scope.player.destroy();
                        scope.clip = clip;
                        // console.log(scope.clip);
                        initYoutube();

                    }
                }

                $scope.$on('$destroy', function() {
                    console.log('e:$destroy');

                    scope.player.pauseVideo();
                    $timeout.cancel(restartTimer);
                    $interval.cancel(initInterval);
                })

                $rootScope.$on('answerGiven', function(e) {
                    scope.player.pauseVideo();
                })

                $rootScope.$on('clipChanged', function(e, c) {
                    changeClip(c)
                });

            }
        };

    });
angular.module('App')
    .directive('resultpopup', function(Api, $timeout, $interval) {

        return {
            restrict: 'E',
            replace: true,
            templateUrl: 'directives/resultpopup.html',
            scope: {
                //snip:    "=snip",
                options: "=options",
                visible: "=visible",
                infos: "=infos"
            },
            controllerAs: 'ResultPopup',
            bindToController: true,
            controller: function($scope, $element, $rootScope) {
                var scope = this;
                console.log(scope.options);
                scope.getURLGif = function() {
                    return './img/gif/' + scope.options.quizz.slug + '/' + (scope.infos.answer.is_correct ? 'correct' : 'wrong') + '/' + Math.floor(Math.random() * (scope.infos.answer.is_correct ? scope.options.quizz.gifs_count.correct : scope.options.quizz.gifs_count.wrong) + 1) + ".gif"
                }

                scope.initURLGif = function() {
                    scope.urlGIF = scope.getURLGif();
                }

                scope.nextClip = function() {
                    scope.initURLGif();
                    $rootScope.$emit('nextClip');
                }

                scope.show = function() {
                    scope.visible = true;
                }

                $rootScope.$on('nextClip', function(e) {
                    scope.visible = false;
                });

                $rootScope.$on('answerGiven', function(e, infos) {
                    scope.show();
                    scope.infos.answer = infos;
                    scope.initURLGif();

                })
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
angular.module('App')
    .controller('LevelCtrl', function($rootScope, $state, Api, $timeout, $stateParams) {
        var scope = this;
        scope.loading = true;
        scope.timer = 0; // in MS

        scope.clipOptions = {};

        scope.level = {};

        scope.actualPosition = 0;

        scope.videos = [];

        scope.currentAnswers = [];

        scope.currentAnswersLoaded = false;

        scope.percentTimerLeft = 100;
        scope.potentialPoints = 300;

        scope.userScore = 0;

        scope.currentAnswersLoaded = false;

        scope.popup = {
            visible: false,
            options: {
                // quizz: {
                //     channel: 'wankil',
                //     gifs: {
                //         correct: 8,
                //         wrong: 4
                //     },
                //     level_count: 10
                // }
            },
            infos: {
                answer: {
                    points: 0,
                    is_correct: true,
                    next: true
                },
                end_game: {},
                type: 'answer'
            }
        }

        scope.quizzInfos = {};

        scope.initClip = function(position) {
            scope.blurAnswers();
            clip = scope.level.clips[position];
            scope.clipOptions = clip;
            scope.actualPosition = position;
            $rootScope.$emit('clipChanged', clip);
            scope.isTimeUp = false;
            if (position != 0) {
                scope.initAnswers();
            }

            scope.resetTimer();
        }



        scope.nextClip = function() {
            actualPosition = scope.actualPosition;
            if (actualPosition + 1 < 5) {
                scope.currentAnswersLoaded = false;
                scope.initClip(actualPosition + 1);
            }
        }

        scope.getVideos = function() {
            //TODO : remove current clip for result if
            Api.call({
                url: 'video/' + $stateParams.channel + '/' + $stateParams.level_id,
                method: 'GET',
                callback: function(res) {
                    scope.videos = res.data.videos;
                    scope.initAnswers();
                }
            })
        }

        scope.initLevel = function(level) {
            Api.call({
                url: 'level/' + $stateParams.channel + '/' + $stateParams.level_id,
                callback: function(res) {
                    if (res.status == "success" && res.data.level) {
                        scope.level = res.data.level;
                        scope.quizzInfos = res.data.infos;
                        scope.popup.options.quizz = res.data.infos;
                        scope.initClip(0);
                        scope.getVideos();
                    } else {
                        console.log(res.message);
                    }
                }
            });
        }

        scope.deleteAnswers = function() {
            scope.currentAnswers = [];
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

        scope.initAnswers = function() {
            //TODO : do this much better, dumb-dumb
            scope.currentAnswersLoaded = false;
            // scope.randomizeVideos();
            // for (var i = 0; i < 3; i++) {
            //     scope.currentAnswers[i] = scope.videos[i];
            // }

            scope.initVideosForClip(scope.level.clips[scope.actualPosition].video_id);

            scope.currentAnswers[3] = {
                id: {
                    videoId: scope.level.clips[scope.actualPosition].video_id
                },
                snippet: {
                    title: scope.level.clips[scope.actualPosition].title,
                    thumbnails: {
                        medium: {
                            url: scope.level.clips[scope.actualPosition].thumbnail
                        }
                    }
                }
            }
            scope.currentAnswers = scope.shuffle(scope.currentAnswers);
            scope.currentAnswersLoaded = true;

            $timeout(scope.unblur, 1000);
            // console.log(scope.currentAnswers);
        }
        scope.initVideosForClip = function(clip_video_id) {
            var videos = scope.videos[clip_video_id];
            for (var i = 0; i < videos.videos.length; i++) {
                scope.currentAnswers[i] = videos.videos[i];
            }
        }
        scope.unblur = function() {
            scope.unblurAnswers = true;
        }

        scope.blurAnswers = function() {
            scope.unblurAnswers = false;
        }
        scope.answer = function(a) {
            scope.stopTimer();

            current_clip_id = scope.level.clips[scope.actualPosition].video_id;
            if (current_clip_id == a) {
                is_correct = true;
            } else {
                is_correct = false;
            }
            gainedPoints = scope.updateUserScore(is_correct);
            $rootScope.$emit('answerGiven', {
                is_correct: is_correct,
                points: gainedPoints,
                next: true
            });
            // scope.nextClip();
        }

        scope.startTimer = function() {
            scope.timer = 0;
            scope.timerTimeout = $timeout(scope.onTimeout, 100);
        }

        scope.resetTimer = function() {
            scope.stopTimer();
            scope.timer = 0;
        }

        scope.onTimeout = function() {
            // TODO : get rid of this
            if (scope.timer >= scope.getChoiceDuraton()) {
                scope.timeIsUp();
                return;
            }
            scope.timer++;
            scope.updateUI();
            scope.timerTimeout = $timeout(scope.onTimeout, 100);
        }

        scope.updatePercentTimerLeft = function() {
            //TODO : make it less frequent
            scope.percentTimerLeft = (scope.getChoiceDuraton() - (scope.timer)) / scope.getChoiceDuraton() * 100;
            // console.log(scope.percentTimerLeft);
        }


        scope.updateUI = function() {
            scope.updatePercentTimerLeft();
            scope.updatePotentialPoints();
        }

        scope.calculatePotentialPoints = function() {
            //TODO : calculate accordingly to the level
            var pointsForThisClip = 300; // TODO : get points for a clip !
            potentialPoints = Math.round(pointsForThisClip - scope.timer * (pointsForThisClip / scope.getChoiceDuraton()));
            return potentialPoints;

        }

        scope.getScore = function() {
            var potentialPoints = scope.calculatePotentialPoints();
            return {
                potentialPoints: potentialPoints,
                wrongPoints: scope.isTimeUp ? -(scope.level.clip_points / 2) : Math.round(-Math.abs(potentialPoints) / 1.5)
            }
        }

        scope.getChoiceDuraton = function() {
            var numberOfLevels = scope.quizzInfos.levels_count;
            var minChoiceDuration = 10 * 10; //10 sec
            var maxChoiceDuration = 30 * 10; // 30 sec
            var currentLevel = scope.level.number; // TODO : get current level

            b = (minChoiceDuration - maxChoiceDuration) / (numberOfLevels - 1);
            c = b * (currentLevel - 1) + maxChoiceDuration;
            // console.log(c);
            return c;
        }

        scope.stopTimer = function() {
            $timeout.cancel(scope.timerTimeout);
        }

        scope.timeIsUp = function() {
            scope.isTimeUp = true;
            scope.stopTimer();
            scope.updateUserScore(false);
        }

        scope.updateUserScore = function(is_correct) {
            // console.log("updateUserScore");
            score = scope.getScore();
            // console.log(score);
            if (is_correct) {
                scope.userScore = scope.userScore + score.potentialPoints;
                return score.potentialPoints;
            } else {
                scope.userScore = scope.userScore + score.wrongPoints;
                return score.wrongPoints;
            }
        }

        scope.updatePotentialPoints = function() {
            scope.potentialPoints = scope.calculatePotentialPoints();
        }

        $rootScope.$on('nextClip', function(e) {
            console.log('e:nextClip');
            scope.nextClip();
        });

        $rootScope.$on('clipStarted', function(e) {
            console.log("e:clipStarted");
            scope.startTimer();
        });

        scope.initLevel();

    });
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImRpcmVjdGl2ZXMvcGxheWVyLmpzIiwiZGlyZWN0aXZlcy9yZXN1bHRwb3B1cC5qcyIsInNlcnZpY2UvYXBpLmpzIiwiY29udHJvbGxlci9sZXZlbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiYW5ndWxhci5tb2R1bGUoJ0FwcCcsIFsndGVtcGxhdGVzJywgJ3VpLnJvdXRlcicsICduZ0FuaW1hdGUnLCAnbmdSb3V0ZScsICdhbmd1bGFyTW9tZW50J10pXHJcblxyXG4uY29uc3RhbnQoJ0NvbmZpZycsIHtcclxuICAgIGFwaUJhc2U6IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArIFwiLy9cIiArIHdpbmRvdy5sb2NhdGlvbi5ob3N0ICsgXCIvYXBpL1wiXHJcbn0pXHJcblxyXG4uY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIsICRzY2VQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcclxuXHJcbiAgICAkc2NlUHJvdmlkZXIuZW5hYmxlZChmYWxzZSk7XHJcbiAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XHJcblxyXG4gICAgJHN0YXRlUHJvdmlkZXJcclxuICAgICAgICAuc3RhdGUoJ2xldmVsJywge1xyXG4gICAgICAgICAgICB1cmw6ICcvbGV2ZWwvOmNoYW5uZWwve2xldmVsX2lkOmludH0nLFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2xldmVsL2luZGV4Lmh0bWwnLFxyXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnTGV2ZWxDdHJsIGFzIExldmVsJ1xyXG4gICAgICAgIH0pLnN0YXRlKCdxdWl6eicsIHtcclxuICAgICAgICAgICAgdXJsOiAnLycsXHJcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAncXVpenovaW5kZXguaHRtbCcsXHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdRdWl6ekN0cmwgYXMgUXVpenonXHJcbiAgICAgICAgfSkuc3RhdGUoJzQwNCcsIHtcclxuICAgICAgICAgICAgdXJsOiAnLzQwNCcsXHJcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnZXJyb3JzLzQwNC5odG1sJ1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoZnVuY3Rpb24oJGluamVjdG9yKSB7XHJcbiAgICAgICAgdmFyICRzdGF0ZTtcclxuICAgICAgICAkc3RhdGUgPSAkaW5qZWN0b3IuZ2V0KCckc3RhdGUnKTtcclxuICAgICAgICByZXR1cm4gJHN0YXRlLmdvKCc0MDQnLCBudWxsLCB7XHJcbiAgICAgICAgICAgIGxvY2F0aW9uOiBmYWxzZVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG59KVxyXG5cclxuLnJ1bihmdW5jdGlvbigkcm9vdFNjb3BlLCAkc3RhdGUsICR0aW1lb3V0KSB7XHJcblxyXG4gICAgJHJvb3RTY29wZS4kc3RhdGUgPSAkc3RhdGU7XHJcbiAgICAkcm9vdFNjb3BlLk1hdGggPSBNYXRoO1xyXG5cclxuICAgICRyb290U2NvcGUuc2FmZUFwcGx5ID0gZnVuY3Rpb24gc2FmZUFwcGx5KG9wZXJhdGlvbikge1xyXG4gICAgICAgIHZhciBwaGFzZSA9IHRoaXMuJHJvb3QuJCRwaGFzZTtcclxuICAgICAgICBpZiAocGhhc2UgIT09ICckYXBwbHknICYmIHBoYXNlICE9PSAnJGRpZ2VzdCcpIHtcclxuICAgICAgICAgICAgdGhpcy4kYXBwbHkob3BlcmF0aW9uKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG9wZXJhdGlvbiAmJiB0eXBlb2Ygb3BlcmF0aW9uID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIG9wZXJhdGlvbigpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG59KVxyXG5cclxuXHJcbi8vUHJvYmFibHkgc2hvdWxkIG1vdmUgdGhpcyBpZiB3ZSBnZXQgbW9yZSB1dGlsIHNoaXRlXHJcbi5maWx0ZXIoJ3RpbWUnLCBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbihtcywgcHJlY2lzZSkge1xyXG5cclxuICAgICAgICB2YXIgdG90YWxTZWNvbmRzID0gbXMgLyAxMDAwO1xyXG5cclxuICAgICAgICB2YXIgaG91cnMgPSBNYXRoLmZsb29yKHRvdGFsU2Vjb25kcyAvIDM2MDApO1xyXG4gICAgICAgIHZhciBtaW51dGVzID0gTWF0aC5mbG9vcih0b3RhbFNlY29uZHMgJSAzNjAwIC8gNjApO1xyXG4gICAgICAgIHZhciBzZWNvbmRzID0gTWF0aC5mbG9vcih0b3RhbFNlY29uZHMgJSA2MCk7XHJcbiAgICAgICAgdmFyIG1pbGxpc2Vjb25kcyA9IE1hdGguZmxvb3IobXMgJSAxMDAwKTtcclxuXHJcbiAgICAgICAgdmFyIHJldDtcclxuICAgICAgICByZXQgPSBob3VycyA/IGhvdXJzICsgXCI6XCIgOiBcIlwiO1xyXG4gICAgICAgIHJldCArPSAobWludXRlcyB8fCBob3VycykgfHwgIXByZWNpc2UgPyAobWludXRlcyA8IDEwID8gJzAnICsgbWludXRlcyA6IG1pbnV0ZXMpICsgXCI6XCIgOiBcIlwiO1xyXG4gICAgICAgIHJldCArPSBzZWNvbmRzIDwgMTAgJiYgIXByZWNpc2UgPyAnMCcgKyBzZWNvbmRzIDogc2Vjb25kcztcclxuICAgICAgICByZXQgKz0gcHJlY2lzZSA/ICcuJyArIChtaWxsaXNlY29uZHMgPCAxMCA/ICcwMCcgKyBtaWxsaXNlY29uZHMgOiAobWlsbGlzZWNvbmRzIDwgMTAwID8gJzAnICsgbWlsbGlzZWNvbmRzIDogbWlsbGlzZWNvbmRzKSkgOiBcIlwiO1xyXG5cclxuICAgICAgICByZXR1cm4gcmV0O1xyXG4gICAgfTtcclxufSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpXHJcbiAgICAuZGlyZWN0aXZlKCdwbGF5ZXInLCBmdW5jdGlvbihBcGksICR0aW1lb3V0LCAkaW50ZXJ2YWwpIHtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdkaXJlY3RpdmVzL3BsYXllci5odG1sJyxcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIC8vc25pcDogICAgXCI9c25pcFwiLFxyXG4gICAgICAgICAgICAgICAgY2xpcDogXCI9Y2xpcFwiXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ1BsYXllcicsXHJcbiAgICAgICAgICAgIGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsXHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgJGVsZW1lbnQsICRyb290U2NvcGUpIHtcclxuICAgICAgICAgICAgICAgIHZhciBzY29wZSA9IHRoaXM7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5wbGF5ZXIgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgdmFyIHBsYXllciwgcmVzdGFydFRpbWVyLCBsb29wU3RhcnRlZCwgaW5pdEludGVydmFsO1xyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGxvb3AoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2xvb3Agc3RhcnRlZCA6IHN0ID0gJyArIHNjb3BlLmNsaXAuc3RhcnRfdGltZSArICcgfCBkdXJhdGlvbiA9ICcgKyBzY29wZS5jbGlwLmR1cmF0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5wbGF5ZXIuc2Vla1RvKHNjb3BlLmNsaXAuc3RhcnRfdGltZSAvIDEwMDAsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHNjb3BlLnBsYXllci5wbGF5VmlkZW8oKTtcclxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dC5jYW5jZWwocmVzdGFydFRpbWVyKTtcclxuICAgICAgICAgICAgICAgICAgICByZXN0YXJ0VGltZXIgPSAkdGltZW91dChsb29wLCBzY29wZS5jbGlwLmR1cmF0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBpbml0WW91dHViZSgpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnaW5pdFlvdXR1YmUnKTtcclxuICAgICAgICAgICAgICAgICAgICBsb29wU3RhcnRlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnBsYXllciA9IG5ldyBZVC5QbGF5ZXIoJ3l0cGxheWVyJywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6ICc0MDAnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogJzEwMCUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwbGF5ZXJWYXJzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sczogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vYXV0b2hpZGU6ICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdXRvcGxheTogMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVrYjogMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWpzYXBpOiAxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnM6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2Rlc3RicmFuZGluZzogMSwgLy9vbmx5IHdvcmtzIHdpdGggY29udHJvbHMgZW5hYmxlZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxheXNpbmxpbmU6IDEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaG93aW5mbzogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbDogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZW1lOiAnZGFyaycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvSWQ6IHNjb3BlLmNsaXAudmlkZW9faWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50czoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ29uUmVhZHknOiBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZS50YXJnZXQuc2V0Vm9sdW1lKDc1KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZTp5dHBsYXllcjpvblJlYWR5Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9TY2FsZSBwbGF5ZXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29udGFpbmVyV2lkdGggPSAkZWxlbWVudFswXS5jbGllbnRXaWR0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnRhcmdldC5nZXRJZnJhbWUoKS53aWR0aCA9IGNvbnRhaW5lcldpZHRoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUudGFyZ2V0LmdldElmcmFtZSgpLmhlaWdodCA9IGNvbnRhaW5lcldpZHRoICogMC41NjI1O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnRhcmdldC5zZWVrVG8oc2NvcGUuY2xpcC5zdGFydF90aW1lIC8gMTAwMCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9lLnRhcmdldC5wbGF5VmlkZW8oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnb25TdGF0ZUNoYW5nZSc6IGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2NvcGUucGxheWVyLmdldFBsYXllclN0YXRlKCkgPT0gMSAmJiAhbG9vcFN0YXJ0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnY2xpcFN0YXJ0ZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9vcFN0YXJ0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb29wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaW5pdEludGVydmFsID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChZVCAmJiBZVC5QbGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGludGVydmFsLmNhbmNlbChpbml0SW50ZXJ2YWwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbml0WW91dHViZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sIDI1KTtcclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBjaGFuZ2VDbGlwKGNsaXApIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc2NvcGUucGxheWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnBsYXllci5kZXN0cm95KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmNsaXAgPSBjbGlwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhzY29wZS5jbGlwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5pdFlvdXR1YmUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2U6JGRlc3Ryb3knKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUucGxheWVyLnBhdXNlVmlkZW8oKTtcclxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dC5jYW5jZWwocmVzdGFydFRpbWVyKTtcclxuICAgICAgICAgICAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKGluaXRJbnRlcnZhbCk7XHJcbiAgICAgICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJG9uKCdhbnN3ZXJHaXZlbicsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5wbGF5ZXIucGF1c2VWaWRlbygpO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRvbignY2xpcENoYW5nZWQnLCBmdW5jdGlvbihlLCBjKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlQ2xpcChjKVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICB9KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJylcclxuICAgIC5kaXJlY3RpdmUoJ3Jlc3VsdHBvcHVwJywgZnVuY3Rpb24oQXBpLCAkdGltZW91dCwgJGludGVydmFsKSB7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnZGlyZWN0aXZlcy9yZXN1bHRwb3B1cC5odG1sJyxcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIC8vc25pcDogICAgXCI9c25pcFwiLFxyXG4gICAgICAgICAgICAgICAgb3B0aW9uczogXCI9b3B0aW9uc1wiLFxyXG4gICAgICAgICAgICAgICAgdmlzaWJsZTogXCI9dmlzaWJsZVwiLFxyXG4gICAgICAgICAgICAgICAgaW5mb3M6IFwiPWluZm9zXCJcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAnUmVzdWx0UG9wdXAnLFxyXG4gICAgICAgICAgICBiaW5kVG9Db250cm9sbGVyOiB0cnVlLFxyXG4gICAgICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsICRlbGVtZW50LCAkcm9vdFNjb3BlKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgc2NvcGUgPSB0aGlzO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coc2NvcGUub3B0aW9ucyk7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5nZXRVUkxHaWYgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJy4vaW1nL2dpZi8nICsgc2NvcGUub3B0aW9ucy5xdWl6ei5zbHVnICsgJy8nICsgKHNjb3BlLmluZm9zLmFuc3dlci5pc19jb3JyZWN0ID8gJ2NvcnJlY3QnIDogJ3dyb25nJykgKyAnLycgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoc2NvcGUuaW5mb3MuYW5zd2VyLmlzX2NvcnJlY3QgPyBzY29wZS5vcHRpb25zLnF1aXp6LmdpZnNfY291bnQuY29ycmVjdCA6IHNjb3BlLm9wdGlvbnMucXVpenouZ2lmc19jb3VudC53cm9uZykgKyAxKSArIFwiLmdpZlwiXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgc2NvcGUuaW5pdFVSTEdpZiA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVybEdJRiA9IHNjb3BlLmdldFVSTEdpZigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHNjb3BlLm5leHRDbGlwID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuaW5pdFVSTEdpZigpO1xyXG4gICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJ25leHRDbGlwJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgc2NvcGUuc2hvdyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJG9uKCduZXh0Q2xpcCcsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRvbignYW5zd2VyR2l2ZW4nLCBmdW5jdGlvbihlLCBpbmZvcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnNob3coKTtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5pbmZvcy5hbnN3ZXIgPSBpbmZvcztcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5pbml0VVJMR2lmKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgfSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpLnNlcnZpY2UoJ0FwaScsIGZ1bmN0aW9uKCRodHRwLCAkcSwgQ29uZmlnLCAkdGltZW91dCkge1xyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIFBlcmZvcm0gYW4gQVBJIGNhbGwuXHJcbiAgICAgKiBAcGFyYW0gb3B0aW9ucyB7dXJsLCBwYXJhbXMsIGRhdGEsIGNhbGxiYWNrLCBtZXRob2QsIGVycm9ySGFuZGxlciAoc2hvdWxkIHJldHVybiB0cnVlKSwgdGltZW91dCBpbiBNUywgYmxvY2tVSX1cclxuICAgICAqL1xyXG4gICAgdGhpcy5jYWxsID0gZnVuY3Rpb24ob3B0aW9ucykge1xyXG5cclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGFuZ3VsYXIuZXh0ZW5kKHtcclxuICAgICAgICAgICAgdXJsOiBudWxsLFxyXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgICAgICBwYXJhbXM6IG51bGwsXHJcbiAgICAgICAgICAgIGRhdGE6IG51bGwsXHJcbiAgICAgICAgICAgIGNhbGxiYWNrOiBudWxsLFxyXG4gICAgICAgICAgICB0aW1lb3V0OiAzMDAwMCxcclxuICAgICAgICAgICAgZXJyb3JIYW5kbGVyOiBudWxsLFxyXG4gICAgICAgICAgICBibG9ja1VJOiB0cnVlLFxyXG4gICAgICAgIH0sIG9wdGlvbnMpO1xyXG5cclxuICAgICAgICB2YXIgY2FuY2VsZXIgPSAkcS5kZWZlcigpO1xyXG4gICAgICAgIHZhciBjYW5jZWxUaW1lb3V0ID0gb3B0aW9ucy50aW1lb3V0ID8gJHRpbWVvdXQoY2FuY2VsZXIucmVzb2x2ZSwgb3B0aW9ucy50aW1lb3V0KSA6IG51bGw7XHJcblxyXG5cclxuICAgICAgICB2YXIgdXJsID0gb3B0aW9ucy51cmwuaW5kZXhPZignaHR0cCcpID09IDAgPyBvcHRpb25zLnVybCA6IENvbmZpZy5hcGlCYXNlICsgb3B0aW9ucy51cmw7XHJcblxyXG4gICAgICAgICRodHRwKHtcclxuICAgICAgICAgICAgdXJsOiB1cmwsXHJcbiAgICAgICAgICAgIG1ldGhvZDogb3B0aW9ucy5tZXRob2QsXHJcbiAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMsXHJcbiAgICAgICAgICAgIGRhdGE6IG9wdGlvbnMuZGF0YSxcclxuICAgICAgICAgICAgdGltZW91dDogY2FuY2VsZXIucHJvbWlzZVxyXG4gICAgICAgIH0pLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAkdGltZW91dC5jYW5jZWwoY2FuY2VsVGltZW91dCk7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5jYWxsYmFjayA9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICBvcHRpb25zLmNhbGxiYWNrKGRhdGEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSkuZXJyb3IoZnVuY3Rpb24obWVzc2FnZSwgc3RhdHVzKSB7XHJcbiAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChjYW5jZWxUaW1lb3V0KTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5lcnJvckhhbmRsZXIgPT0gJ2Z1bmN0aW9uJyAmJiBvcHRpb25zLmVycm9ySGFuZGxlcihtZXNzYWdlLCBzdGF0dXMpKSB7XHJcbiAgICAgICAgICAgICAgICAvL0Vycm9yIHdhcyBoYW5kbGVkIGJ5IHRoZSBjdXN0b20gZXJyb3IgaGFuZGxlclxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIXN0YXR1cykge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFcnJvciB3aXRob3V0IHN0YXR1czsgcmVxdWVzdCBhYm9ydGVkP1wiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgY2FuY2VsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIGNhbmNlbGVyLnJlc29sdmUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgfTtcclxuXHJcbn0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKVxyXG4gICAgLmNvbnRyb2xsZXIoJ0xldmVsQ3RybCcsIGZ1bmN0aW9uKCRyb290U2NvcGUsICRzdGF0ZSwgQXBpLCAkdGltZW91dCwgJHN0YXRlUGFyYW1zKSB7XHJcbiAgICAgICAgdmFyIHNjb3BlID0gdGhpcztcclxuICAgICAgICBzY29wZS5sb2FkaW5nID0gdHJ1ZTtcclxuICAgICAgICBzY29wZS50aW1lciA9IDA7IC8vIGluIE1TXHJcblxyXG4gICAgICAgIHNjb3BlLmNsaXBPcHRpb25zID0ge307XHJcblxyXG4gICAgICAgIHNjb3BlLmxldmVsID0ge307XHJcblxyXG4gICAgICAgIHNjb3BlLmFjdHVhbFBvc2l0aW9uID0gMDtcclxuXHJcbiAgICAgICAgc2NvcGUudmlkZW9zID0gW107XHJcblxyXG4gICAgICAgIHNjb3BlLmN1cnJlbnRBbnN3ZXJzID0gW107XHJcblxyXG4gICAgICAgIHNjb3BlLmN1cnJlbnRBbnN3ZXJzTG9hZGVkID0gZmFsc2U7XHJcblxyXG4gICAgICAgIHNjb3BlLnBlcmNlbnRUaW1lckxlZnQgPSAxMDA7XHJcbiAgICAgICAgc2NvcGUucG90ZW50aWFsUG9pbnRzID0gMzAwO1xyXG5cclxuICAgICAgICBzY29wZS51c2VyU2NvcmUgPSAwO1xyXG5cclxuICAgICAgICBzY29wZS5jdXJyZW50QW5zd2Vyc0xvYWRlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICBzY29wZS5wb3B1cCA9IHtcclxuICAgICAgICAgICAgdmlzaWJsZTogZmFsc2UsXHJcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgIC8vIHF1aXp6OiB7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgY2hhbm5lbDogJ3dhbmtpbCcsXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgZ2lmczoge1xyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBjb3JyZWN0OiA4LFxyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICB3cm9uZzogNFxyXG4gICAgICAgICAgICAgICAgLy8gICAgIH0sXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgbGV2ZWxfY291bnQ6IDEwXHJcbiAgICAgICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGluZm9zOiB7XHJcbiAgICAgICAgICAgICAgICBhbnN3ZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICBwb2ludHM6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgaXNfY29ycmVjdDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBuZXh0OiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgZW5kX2dhbWU6IHt9LFxyXG4gICAgICAgICAgICAgICAgdHlwZTogJ2Fuc3dlcidcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUucXVpenpJbmZvcyA9IHt9O1xyXG5cclxuICAgICAgICBzY29wZS5pbml0Q2xpcCA9IGZ1bmN0aW9uKHBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLmJsdXJBbnN3ZXJzKCk7XHJcbiAgICAgICAgICAgIGNsaXAgPSBzY29wZS5sZXZlbC5jbGlwc1twb3NpdGlvbl07XHJcbiAgICAgICAgICAgIHNjb3BlLmNsaXBPcHRpb25zID0gY2xpcDtcclxuICAgICAgICAgICAgc2NvcGUuYWN0dWFsUG9zaXRpb24gPSBwb3NpdGlvbjtcclxuICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnY2xpcENoYW5nZWQnLCBjbGlwKTtcclxuICAgICAgICAgICAgc2NvcGUuaXNUaW1lVXAgPSBmYWxzZTtcclxuICAgICAgICAgICAgaWYgKHBvc2l0aW9uICE9IDApIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLmluaXRBbnN3ZXJzKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHNjb3BlLnJlc2V0VGltZXIoKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgc2NvcGUubmV4dENsaXAgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgYWN0dWFsUG9zaXRpb24gPSBzY29wZS5hY3R1YWxQb3NpdGlvbjtcclxuICAgICAgICAgICAgaWYgKGFjdHVhbFBvc2l0aW9uICsgMSA8IDUpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLmN1cnJlbnRBbnN3ZXJzTG9hZGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5pbml0Q2xpcChhY3R1YWxQb3NpdGlvbiArIDEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5nZXRWaWRlb3MgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgLy9UT0RPIDogcmVtb3ZlIGN1cnJlbnQgY2xpcCBmb3IgcmVzdWx0IGlmXHJcbiAgICAgICAgICAgIEFwaS5jYWxsKHtcclxuICAgICAgICAgICAgICAgIHVybDogJ3ZpZGVvLycgKyAkc3RhdGVQYXJhbXMuY2hhbm5lbCArICcvJyArICRzdGF0ZVBhcmFtcy5sZXZlbF9pZCxcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24ocmVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudmlkZW9zID0gcmVzLmRhdGEudmlkZW9zO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmluaXRBbnN3ZXJzKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5pbml0TGV2ZWwgPSBmdW5jdGlvbihsZXZlbCkge1xyXG4gICAgICAgICAgICBBcGkuY2FsbCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICdsZXZlbC8nICsgJHN0YXRlUGFyYW1zLmNoYW5uZWwgKyAnLycgKyAkc3RhdGVQYXJhbXMubGV2ZWxfaWQsXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24ocmVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlcy5zdGF0dXMgPT0gXCJzdWNjZXNzXCIgJiYgcmVzLmRhdGEubGV2ZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUubGV2ZWwgPSByZXMuZGF0YS5sZXZlbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUucXVpenpJbmZvcyA9IHJlcy5kYXRhLmluZm9zO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5wb3B1cC5vcHRpb25zLnF1aXp6ID0gcmVzLmRhdGEuaW5mb3M7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmluaXRDbGlwKDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5nZXRWaWRlb3MoKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXMubWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLmRlbGV0ZUFuc3dlcnMgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUuY3VycmVudEFuc3dlcnMgPSBbXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLnJhbmRvbWl6ZVZpZGVvcyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBzY29wZS52aWRlb3MgPSBzY29wZS5zaHVmZmxlKHNjb3BlLnZpZGVvcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5zaHVmZmxlID0gZnVuY3Rpb24oYSkge1xyXG4gICAgICAgICAgICB2YXIgaiwgeCwgaTtcclxuICAgICAgICAgICAgZm9yIChpID0gYS5sZW5ndGg7IGk7IGktLSkge1xyXG4gICAgICAgICAgICAgICAgaiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGkpO1xyXG4gICAgICAgICAgICAgICAgeCA9IGFbaSAtIDFdO1xyXG4gICAgICAgICAgICAgICAgYVtpIC0gMV0gPSBhW2pdO1xyXG4gICAgICAgICAgICAgICAgYVtqXSA9IHg7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGE7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5pbml0QW5zd2VycyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAvL1RPRE8gOiBkbyB0aGlzIG11Y2ggYmV0dGVyLCBkdW1iLWR1bWJcclxuICAgICAgICAgICAgc2NvcGUuY3VycmVudEFuc3dlcnNMb2FkZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgLy8gc2NvcGUucmFuZG9taXplVmlkZW9zKCk7XHJcbiAgICAgICAgICAgIC8vIGZvciAodmFyIGkgPSAwOyBpIDwgMzsgaSsrKSB7XHJcbiAgICAgICAgICAgIC8vICAgICBzY29wZS5jdXJyZW50QW5zd2Vyc1tpXSA9IHNjb3BlLnZpZGVvc1tpXTtcclxuICAgICAgICAgICAgLy8gfVxyXG5cclxuICAgICAgICAgICAgc2NvcGUuaW5pdFZpZGVvc0ZvckNsaXAoc2NvcGUubGV2ZWwuY2xpcHNbc2NvcGUuYWN0dWFsUG9zaXRpb25dLnZpZGVvX2lkKTtcclxuXHJcbiAgICAgICAgICAgIHNjb3BlLmN1cnJlbnRBbnN3ZXJzWzNdID0ge1xyXG4gICAgICAgICAgICAgICAgaWQ6IHtcclxuICAgICAgICAgICAgICAgICAgICB2aWRlb0lkOiBzY29wZS5sZXZlbC5jbGlwc1tzY29wZS5hY3R1YWxQb3NpdGlvbl0udmlkZW9faWRcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBzbmlwcGV0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6IHNjb3BlLmxldmVsLmNsaXBzW3Njb3BlLmFjdHVhbFBvc2l0aW9uXS50aXRsZSxcclxuICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWxzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lZGl1bToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiBzY29wZS5sZXZlbC5jbGlwc1tzY29wZS5hY3R1YWxQb3NpdGlvbl0udGh1bWJuYWlsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2NvcGUuY3VycmVudEFuc3dlcnMgPSBzY29wZS5zaHVmZmxlKHNjb3BlLmN1cnJlbnRBbnN3ZXJzKTtcclxuICAgICAgICAgICAgc2NvcGUuY3VycmVudEFuc3dlcnNMb2FkZWQgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgJHRpbWVvdXQoc2NvcGUudW5ibHVyLCAxMDAwKTtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coc2NvcGUuY3VycmVudEFuc3dlcnMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzY29wZS5pbml0VmlkZW9zRm9yQ2xpcCA9IGZ1bmN0aW9uKGNsaXBfdmlkZW9faWQpIHtcclxuICAgICAgICAgICAgdmFyIHZpZGVvcyA9IHNjb3BlLnZpZGVvc1tjbGlwX3ZpZGVvX2lkXTtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2aWRlb3MudmlkZW9zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5jdXJyZW50QW5zd2Vyc1tpXSA9IHZpZGVvcy52aWRlb3NbaV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgc2NvcGUudW5ibHVyID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLnVuYmx1ckFuc3dlcnMgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUuYmx1ckFuc3dlcnMgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUudW5ibHVyQW5zd2VycyA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzY29wZS5hbnN3ZXIgPSBmdW5jdGlvbihhKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLnN0b3BUaW1lcigpO1xyXG5cclxuICAgICAgICAgICAgY3VycmVudF9jbGlwX2lkID0gc2NvcGUubGV2ZWwuY2xpcHNbc2NvcGUuYWN0dWFsUG9zaXRpb25dLnZpZGVvX2lkO1xyXG4gICAgICAgICAgICBpZiAoY3VycmVudF9jbGlwX2lkID09IGEpIHtcclxuICAgICAgICAgICAgICAgIGlzX2NvcnJlY3QgPSB0cnVlO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaXNfY29ycmVjdCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGdhaW5lZFBvaW50cyA9IHNjb3BlLnVwZGF0ZVVzZXJTY29yZShpc19jb3JyZWN0KTtcclxuICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnYW5zd2VyR2l2ZW4nLCB7XHJcbiAgICAgICAgICAgICAgICBpc19jb3JyZWN0OiBpc19jb3JyZWN0LFxyXG4gICAgICAgICAgICAgICAgcG9pbnRzOiBnYWluZWRQb2ludHMsXHJcbiAgICAgICAgICAgICAgICBuZXh0OiB0cnVlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAvLyBzY29wZS5uZXh0Q2xpcCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUuc3RhcnRUaW1lciA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBzY29wZS50aW1lciA9IDA7XHJcbiAgICAgICAgICAgIHNjb3BlLnRpbWVyVGltZW91dCA9ICR0aW1lb3V0KHNjb3BlLm9uVGltZW91dCwgMTAwKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLnJlc2V0VGltZXIgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUuc3RvcFRpbWVyKCk7XHJcbiAgICAgICAgICAgIHNjb3BlLnRpbWVyID0gMDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLm9uVGltZW91dCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAvLyBUT0RPIDogZ2V0IHJpZCBvZiB0aGlzXHJcbiAgICAgICAgICAgIGlmIChzY29wZS50aW1lciA+PSBzY29wZS5nZXRDaG9pY2VEdXJhdG9uKCkpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLnRpbWVJc1VwKCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2NvcGUudGltZXIrKztcclxuICAgICAgICAgICAgc2NvcGUudXBkYXRlVUkoKTtcclxuICAgICAgICAgICAgc2NvcGUudGltZXJUaW1lb3V0ID0gJHRpbWVvdXQoc2NvcGUub25UaW1lb3V0LCAxMDApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUudXBkYXRlUGVyY2VudFRpbWVyTGVmdCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAvL1RPRE8gOiBtYWtlIGl0IGxlc3MgZnJlcXVlbnRcclxuICAgICAgICAgICAgc2NvcGUucGVyY2VudFRpbWVyTGVmdCA9IChzY29wZS5nZXRDaG9pY2VEdXJhdG9uKCkgLSAoc2NvcGUudGltZXIpKSAvIHNjb3BlLmdldENob2ljZUR1cmF0b24oKSAqIDEwMDtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coc2NvcGUucGVyY2VudFRpbWVyTGVmdCk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgc2NvcGUudXBkYXRlVUkgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUudXBkYXRlUGVyY2VudFRpbWVyTGVmdCgpO1xyXG4gICAgICAgICAgICBzY29wZS51cGRhdGVQb3RlbnRpYWxQb2ludHMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLmNhbGN1bGF0ZVBvdGVudGlhbFBvaW50cyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAvL1RPRE8gOiBjYWxjdWxhdGUgYWNjb3JkaW5nbHkgdG8gdGhlIGxldmVsXHJcbiAgICAgICAgICAgIHZhciBwb2ludHNGb3JUaGlzQ2xpcCA9IDMwMDsgLy8gVE9ETyA6IGdldCBwb2ludHMgZm9yIGEgY2xpcCAhXHJcbiAgICAgICAgICAgIHBvdGVudGlhbFBvaW50cyA9IE1hdGgucm91bmQocG9pbnRzRm9yVGhpc0NsaXAgLSBzY29wZS50aW1lciAqIChwb2ludHNGb3JUaGlzQ2xpcCAvIHNjb3BlLmdldENob2ljZUR1cmF0b24oKSkpO1xyXG4gICAgICAgICAgICByZXR1cm4gcG90ZW50aWFsUG9pbnRzO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLmdldFNjb3JlID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBwb3RlbnRpYWxQb2ludHMgPSBzY29wZS5jYWxjdWxhdGVQb3RlbnRpYWxQb2ludHMoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHBvdGVudGlhbFBvaW50czogcG90ZW50aWFsUG9pbnRzLFxyXG4gICAgICAgICAgICAgICAgd3JvbmdQb2ludHM6IHNjb3BlLmlzVGltZVVwID8gLShzY29wZS5sZXZlbC5jbGlwX3BvaW50cyAvIDIpIDogTWF0aC5yb3VuZCgtTWF0aC5hYnMocG90ZW50aWFsUG9pbnRzKSAvIDEuNSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUuZ2V0Q2hvaWNlRHVyYXRvbiA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgbnVtYmVyT2ZMZXZlbHMgPSBzY29wZS5xdWl6ekluZm9zLmxldmVsc19jb3VudDtcclxuICAgICAgICAgICAgdmFyIG1pbkNob2ljZUR1cmF0aW9uID0gMTAgKiAxMDsgLy8xMCBzZWNcclxuICAgICAgICAgICAgdmFyIG1heENob2ljZUR1cmF0aW9uID0gMzAgKiAxMDsgLy8gMzAgc2VjXHJcbiAgICAgICAgICAgIHZhciBjdXJyZW50TGV2ZWwgPSBzY29wZS5sZXZlbC5udW1iZXI7IC8vIFRPRE8gOiBnZXQgY3VycmVudCBsZXZlbFxyXG5cclxuICAgICAgICAgICAgYiA9IChtaW5DaG9pY2VEdXJhdGlvbiAtIG1heENob2ljZUR1cmF0aW9uKSAvIChudW1iZXJPZkxldmVscyAtIDEpO1xyXG4gICAgICAgICAgICBjID0gYiAqIChjdXJyZW50TGV2ZWwgLSAxKSArIG1heENob2ljZUR1cmF0aW9uO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhjKTtcclxuICAgICAgICAgICAgcmV0dXJuIGM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5zdG9wVGltZXIgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKHNjb3BlLnRpbWVyVGltZW91dCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS50aW1lSXNVcCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBzY29wZS5pc1RpbWVVcCA9IHRydWU7XHJcbiAgICAgICAgICAgIHNjb3BlLnN0b3BUaW1lcigpO1xyXG4gICAgICAgICAgICBzY29wZS51cGRhdGVVc2VyU2NvcmUoZmFsc2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUudXBkYXRlVXNlclNjb3JlID0gZnVuY3Rpb24oaXNfY29ycmVjdCkge1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcInVwZGF0ZVVzZXJTY29yZVwiKTtcclxuICAgICAgICAgICAgc2NvcmUgPSBzY29wZS5nZXRTY29yZSgpO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhzY29yZSk7XHJcbiAgICAgICAgICAgIGlmIChpc19jb3JyZWN0KSB7XHJcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyU2NvcmUgPSBzY29wZS51c2VyU2NvcmUgKyBzY29yZS5wb3RlbnRpYWxQb2ludHM7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2NvcmUucG90ZW50aWFsUG9pbnRzO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc2NvcGUudXNlclNjb3JlID0gc2NvcGUudXNlclNjb3JlICsgc2NvcmUud3JvbmdQb2ludHM7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2NvcmUud3JvbmdQb2ludHM7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLnVwZGF0ZVBvdGVudGlhbFBvaW50cyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBzY29wZS5wb3RlbnRpYWxQb2ludHMgPSBzY29wZS5jYWxjdWxhdGVQb3RlbnRpYWxQb2ludHMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgICRyb290U2NvcGUuJG9uKCduZXh0Q2xpcCcsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ2U6bmV4dENsaXAnKTtcclxuICAgICAgICAgICAgc2NvcGUubmV4dENsaXAoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHJvb3RTY29wZS4kb24oJ2NsaXBTdGFydGVkJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImU6Y2xpcFN0YXJ0ZWRcIik7XHJcbiAgICAgICAgICAgIHNjb3BlLnN0YXJ0VGltZXIoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgc2NvcGUuaW5pdExldmVsKCk7XHJcblxyXG4gICAgfSk7Il19
