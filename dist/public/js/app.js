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

        scope.initVideos = function() {
            //TODO : do it via internal API
            //TODO : remove current clip for result if
            Api.call({
                url: 'https://www.googleapis.com/youtube/v3/search?key=AIzaSyBMDrVhmiR2Av3cBfm2_RM7XVvD6udLwuo&channelId=' + scope.quizzInfos.channel_youtube_ID + '&part=snippet&order=date&maxResults=50&type=video',
                method: 'GET',
                callback: function(res) {
                    scope.videos = res.items;
                    scope.initAnswers();
                }
            })
        }
        scope.initLevel = function(level) {
            Api.call({
                url: 'level/' + $stateParams.channel + '/' + $stateParams.level_id,
                callback: function(res) {
                    console.log(res);
                    if (res.status == "success" && res.data.level) {
                        scope.level = res.data.level;
                        scope.quizzInfos = res.data.infos;
                        scope.popup.options.quizz = res.data.infos;
                        console.log(scope.popup);
                        scope.initClip(0);
                        scope.initVideos();
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
            scope.randomizeVideos();
            for (var i = 0; i < 3; i++) {
                scope.currentAnswers[i] = scope.videos[i];
            }
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImRpcmVjdGl2ZXMvcGxheWVyLmpzIiwiZGlyZWN0aXZlcy9yZXN1bHRwb3B1cC5qcyIsInNlcnZpY2UvYXBpLmpzIiwiY29udHJvbGxlci9sZXZlbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiYW5ndWxhci5tb2R1bGUoJ0FwcCcsIFsndGVtcGxhdGVzJywgJ3VpLnJvdXRlcicsICduZ0FuaW1hdGUnLCAnbmdSb3V0ZScsICdhbmd1bGFyTW9tZW50J10pXHJcblxyXG4uY29uc3RhbnQoJ0NvbmZpZycsIHtcclxuICAgIGFwaUJhc2U6IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArIFwiLy9cIiArIHdpbmRvdy5sb2NhdGlvbi5ob3N0ICsgXCIvYXBpL1wiXHJcbn0pXHJcblxyXG4uY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIsICRzY2VQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcclxuXHJcbiAgICAkc2NlUHJvdmlkZXIuZW5hYmxlZChmYWxzZSk7XHJcbiAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XHJcblxyXG4gICAgJHN0YXRlUHJvdmlkZXJcclxuICAgICAgICAuc3RhdGUoJ2xldmVsJywge1xyXG4gICAgICAgICAgICB1cmw6ICcvbGV2ZWwvOmNoYW5uZWwve2xldmVsX2lkOmludH0nLFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2xldmVsL2luZGV4Lmh0bWwnLFxyXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnTGV2ZWxDdHJsIGFzIExldmVsJ1xyXG4gICAgICAgIH0pLnN0YXRlKCdxdWl6eicsIHtcclxuICAgICAgICAgICAgdXJsOiAnLycsXHJcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAncXVpenovaW5kZXguaHRtbCcsXHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdRdWl6ekN0cmwgYXMgUXVpenonXHJcbiAgICAgICAgfSkuc3RhdGUoJzQwNCcsIHtcclxuICAgICAgICAgICAgdXJsOiAnLzQwNCcsXHJcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnZXJyb3JzLzQwNC5odG1sJ1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoZnVuY3Rpb24oJGluamVjdG9yKSB7XHJcbiAgICAgICAgdmFyICRzdGF0ZTtcclxuICAgICAgICAkc3RhdGUgPSAkaW5qZWN0b3IuZ2V0KCckc3RhdGUnKTtcclxuICAgICAgICByZXR1cm4gJHN0YXRlLmdvKCc0MDQnLCBudWxsLCB7XHJcbiAgICAgICAgICAgIGxvY2F0aW9uOiBmYWxzZVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG59KVxyXG5cclxuLnJ1bihmdW5jdGlvbigkcm9vdFNjb3BlLCAkc3RhdGUsICR0aW1lb3V0KSB7XHJcblxyXG4gICAgJHJvb3RTY29wZS4kc3RhdGUgPSAkc3RhdGU7XHJcbiAgICAkcm9vdFNjb3BlLk1hdGggPSBNYXRoO1xyXG5cclxuICAgICRyb290U2NvcGUuc2FmZUFwcGx5ID0gZnVuY3Rpb24gc2FmZUFwcGx5KG9wZXJhdGlvbikge1xyXG4gICAgICAgIHZhciBwaGFzZSA9IHRoaXMuJHJvb3QuJCRwaGFzZTtcclxuICAgICAgICBpZiAocGhhc2UgIT09ICckYXBwbHknICYmIHBoYXNlICE9PSAnJGRpZ2VzdCcpIHtcclxuICAgICAgICAgICAgdGhpcy4kYXBwbHkob3BlcmF0aW9uKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG9wZXJhdGlvbiAmJiB0eXBlb2Ygb3BlcmF0aW9uID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIG9wZXJhdGlvbigpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG59KVxyXG5cclxuXHJcbi8vUHJvYmFibHkgc2hvdWxkIG1vdmUgdGhpcyBpZiB3ZSBnZXQgbW9yZSB1dGlsIHNoaXRlXHJcbi5maWx0ZXIoJ3RpbWUnLCBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbihtcywgcHJlY2lzZSkge1xyXG5cclxuICAgICAgICB2YXIgdG90YWxTZWNvbmRzID0gbXMgLyAxMDAwO1xyXG5cclxuICAgICAgICB2YXIgaG91cnMgPSBNYXRoLmZsb29yKHRvdGFsU2Vjb25kcyAvIDM2MDApO1xyXG4gICAgICAgIHZhciBtaW51dGVzID0gTWF0aC5mbG9vcih0b3RhbFNlY29uZHMgJSAzNjAwIC8gNjApO1xyXG4gICAgICAgIHZhciBzZWNvbmRzID0gTWF0aC5mbG9vcih0b3RhbFNlY29uZHMgJSA2MCk7XHJcbiAgICAgICAgdmFyIG1pbGxpc2Vjb25kcyA9IE1hdGguZmxvb3IobXMgJSAxMDAwKTtcclxuXHJcbiAgICAgICAgdmFyIHJldDtcclxuICAgICAgICByZXQgPSBob3VycyA/IGhvdXJzICsgXCI6XCIgOiBcIlwiO1xyXG4gICAgICAgIHJldCArPSAobWludXRlcyB8fCBob3VycykgfHwgIXByZWNpc2UgPyAobWludXRlcyA8IDEwID8gJzAnICsgbWludXRlcyA6IG1pbnV0ZXMpICsgXCI6XCIgOiBcIlwiO1xyXG4gICAgICAgIHJldCArPSBzZWNvbmRzIDwgMTAgJiYgIXByZWNpc2UgPyAnMCcgKyBzZWNvbmRzIDogc2Vjb25kcztcclxuICAgICAgICByZXQgKz0gcHJlY2lzZSA/ICcuJyArIChtaWxsaXNlY29uZHMgPCAxMCA/ICcwMCcgKyBtaWxsaXNlY29uZHMgOiAobWlsbGlzZWNvbmRzIDwgMTAwID8gJzAnICsgbWlsbGlzZWNvbmRzIDogbWlsbGlzZWNvbmRzKSkgOiBcIlwiO1xyXG5cclxuICAgICAgICByZXR1cm4gcmV0O1xyXG4gICAgfTtcclxufSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpXHJcbiAgICAuZGlyZWN0aXZlKCdwbGF5ZXInLCBmdW5jdGlvbihBcGksICR0aW1lb3V0LCAkaW50ZXJ2YWwpIHtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdkaXJlY3RpdmVzL3BsYXllci5odG1sJyxcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIC8vc25pcDogICAgXCI9c25pcFwiLFxyXG4gICAgICAgICAgICAgICAgY2xpcDogXCI9Y2xpcFwiXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ1BsYXllcicsXHJcbiAgICAgICAgICAgIGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsXHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgJGVsZW1lbnQsICRyb290U2NvcGUpIHtcclxuICAgICAgICAgICAgICAgIHZhciBzY29wZSA9IHRoaXM7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5wbGF5ZXIgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgdmFyIHBsYXllciwgcmVzdGFydFRpbWVyLCBsb29wU3RhcnRlZCwgaW5pdEludGVydmFsO1xyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGxvb3AoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2xvb3Agc3RhcnRlZCA6IHN0ID0gJyArIHNjb3BlLmNsaXAuc3RhcnRfdGltZSArICcgfCBkdXJhdGlvbiA9ICcgKyBzY29wZS5jbGlwLmR1cmF0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5wbGF5ZXIuc2Vla1RvKHNjb3BlLmNsaXAuc3RhcnRfdGltZSAvIDEwMDAsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHNjb3BlLnBsYXllci5wbGF5VmlkZW8oKTtcclxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dC5jYW5jZWwocmVzdGFydFRpbWVyKTtcclxuICAgICAgICAgICAgICAgICAgICByZXN0YXJ0VGltZXIgPSAkdGltZW91dChsb29wLCBzY29wZS5jbGlwLmR1cmF0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBpbml0WW91dHViZSgpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnaW5pdFlvdXR1YmUnKTtcclxuICAgICAgICAgICAgICAgICAgICBsb29wU3RhcnRlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnBsYXllciA9IG5ldyBZVC5QbGF5ZXIoJ3l0cGxheWVyJywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6ICc0MDAnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogJzEwMCUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwbGF5ZXJWYXJzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sczogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vYXV0b2hpZGU6ICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdXRvcGxheTogMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVrYjogMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWpzYXBpOiAxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnM6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2Rlc3RicmFuZGluZzogMSwgLy9vbmx5IHdvcmtzIHdpdGggY29udHJvbHMgZW5hYmxlZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxheXNpbmxpbmU6IDEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaG93aW5mbzogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbDogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZW1lOiAnZGFyaycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvSWQ6IHNjb3BlLmNsaXAudmlkZW9faWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50czoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ29uUmVhZHknOiBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZS50YXJnZXQuc2V0Vm9sdW1lKDc1KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZTp5dHBsYXllcjpvblJlYWR5Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9TY2FsZSBwbGF5ZXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29udGFpbmVyV2lkdGggPSAkZWxlbWVudFswXS5jbGllbnRXaWR0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnRhcmdldC5nZXRJZnJhbWUoKS53aWR0aCA9IGNvbnRhaW5lcldpZHRoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUudGFyZ2V0LmdldElmcmFtZSgpLmhlaWdodCA9IGNvbnRhaW5lcldpZHRoICogMC41NjI1O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnRhcmdldC5zZWVrVG8oc2NvcGUuY2xpcC5zdGFydF90aW1lIC8gMTAwMCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9lLnRhcmdldC5wbGF5VmlkZW8oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnb25TdGF0ZUNoYW5nZSc6IGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2NvcGUucGxheWVyLmdldFBsYXllclN0YXRlKCkgPT0gMSAmJiAhbG9vcFN0YXJ0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnY2xpcFN0YXJ0ZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9vcFN0YXJ0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb29wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaW5pdEludGVydmFsID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChZVCAmJiBZVC5QbGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGludGVydmFsLmNhbmNlbChpbml0SW50ZXJ2YWwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbml0WW91dHViZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sIDI1KTtcclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBjaGFuZ2VDbGlwKGNsaXApIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc2NvcGUucGxheWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnBsYXllci5kZXN0cm95KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmNsaXAgPSBjbGlwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhzY29wZS5jbGlwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5pdFlvdXR1YmUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2U6JGRlc3Ryb3knKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUucGxheWVyLnBhdXNlVmlkZW8oKTtcclxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dC5jYW5jZWwocmVzdGFydFRpbWVyKTtcclxuICAgICAgICAgICAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKGluaXRJbnRlcnZhbCk7XHJcbiAgICAgICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJG9uKCdhbnN3ZXJHaXZlbicsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5wbGF5ZXIucGF1c2VWaWRlbygpO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRvbignY2xpcENoYW5nZWQnLCBmdW5jdGlvbihlLCBjKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlQ2xpcChjKVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICB9KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJylcclxuICAgIC5kaXJlY3RpdmUoJ3Jlc3VsdHBvcHVwJywgZnVuY3Rpb24oQXBpLCAkdGltZW91dCwgJGludGVydmFsKSB7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXHJcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXHJcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnZGlyZWN0aXZlcy9yZXN1bHRwb3B1cC5odG1sJyxcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIC8vc25pcDogICAgXCI9c25pcFwiLFxyXG4gICAgICAgICAgICAgICAgb3B0aW9uczogXCI9b3B0aW9uc1wiLFxyXG4gICAgICAgICAgICAgICAgdmlzaWJsZTogXCI9dmlzaWJsZVwiLFxyXG4gICAgICAgICAgICAgICAgaW5mb3M6IFwiPWluZm9zXCJcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAnUmVzdWx0UG9wdXAnLFxyXG4gICAgICAgICAgICBiaW5kVG9Db250cm9sbGVyOiB0cnVlLFxyXG4gICAgICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsICRlbGVtZW50LCAkcm9vdFNjb3BlKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgc2NvcGUgPSB0aGlzO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coc2NvcGUub3B0aW9ucyk7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5nZXRVUkxHaWYgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJy4vaW1nL2dpZi8nICsgc2NvcGUub3B0aW9ucy5xdWl6ei5zbHVnICsgJy8nICsgKHNjb3BlLmluZm9zLmFuc3dlci5pc19jb3JyZWN0ID8gJ2NvcnJlY3QnIDogJ3dyb25nJykgKyAnLycgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoc2NvcGUuaW5mb3MuYW5zd2VyLmlzX2NvcnJlY3QgPyBzY29wZS5vcHRpb25zLnF1aXp6LmdpZnNfY291bnQuY29ycmVjdCA6IHNjb3BlLm9wdGlvbnMucXVpenouZ2lmc19jb3VudC53cm9uZykgKyAxKSArIFwiLmdpZlwiXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgc2NvcGUuaW5pdFVSTEdpZiA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVybEdJRiA9IHNjb3BlLmdldFVSTEdpZigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHNjb3BlLm5leHRDbGlwID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuaW5pdFVSTEdpZigpO1xyXG4gICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJ25leHRDbGlwJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgc2NvcGUuc2hvdyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJG9uKCduZXh0Q2xpcCcsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRvbignYW5zd2VyR2l2ZW4nLCBmdW5jdGlvbihlLCBpbmZvcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnNob3coKTtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5pbmZvcy5hbnN3ZXIgPSBpbmZvcztcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5pbml0VVJMR2lmKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgfSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpLnNlcnZpY2UoJ0FwaScsIGZ1bmN0aW9uKCRodHRwLCAkcSwgQ29uZmlnLCAkdGltZW91dCkge1xyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIFBlcmZvcm0gYW4gQVBJIGNhbGwuXHJcbiAgICAgKiBAcGFyYW0gb3B0aW9ucyB7dXJsLCBwYXJhbXMsIGRhdGEsIGNhbGxiYWNrLCBtZXRob2QsIGVycm9ySGFuZGxlciAoc2hvdWxkIHJldHVybiB0cnVlKSwgdGltZW91dCBpbiBNUywgYmxvY2tVSX1cclxuICAgICAqL1xyXG4gICAgdGhpcy5jYWxsID0gZnVuY3Rpb24ob3B0aW9ucykge1xyXG5cclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGFuZ3VsYXIuZXh0ZW5kKHtcclxuICAgICAgICAgICAgdXJsOiBudWxsLFxyXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgICAgICBwYXJhbXM6IG51bGwsXHJcbiAgICAgICAgICAgIGRhdGE6IG51bGwsXHJcbiAgICAgICAgICAgIGNhbGxiYWNrOiBudWxsLFxyXG4gICAgICAgICAgICB0aW1lb3V0OiAzMDAwMCxcclxuICAgICAgICAgICAgZXJyb3JIYW5kbGVyOiBudWxsLFxyXG4gICAgICAgICAgICBibG9ja1VJOiB0cnVlLFxyXG4gICAgICAgIH0sIG9wdGlvbnMpO1xyXG5cclxuICAgICAgICB2YXIgY2FuY2VsZXIgPSAkcS5kZWZlcigpO1xyXG4gICAgICAgIHZhciBjYW5jZWxUaW1lb3V0ID0gb3B0aW9ucy50aW1lb3V0ID8gJHRpbWVvdXQoY2FuY2VsZXIucmVzb2x2ZSwgb3B0aW9ucy50aW1lb3V0KSA6IG51bGw7XHJcblxyXG5cclxuICAgICAgICB2YXIgdXJsID0gb3B0aW9ucy51cmwuaW5kZXhPZignaHR0cCcpID09IDAgPyBvcHRpb25zLnVybCA6IENvbmZpZy5hcGlCYXNlICsgb3B0aW9ucy51cmw7XHJcblxyXG4gICAgICAgICRodHRwKHtcclxuICAgICAgICAgICAgdXJsOiB1cmwsXHJcbiAgICAgICAgICAgIG1ldGhvZDogb3B0aW9ucy5tZXRob2QsXHJcbiAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMsXHJcbiAgICAgICAgICAgIGRhdGE6IG9wdGlvbnMuZGF0YSxcclxuICAgICAgICAgICAgdGltZW91dDogY2FuY2VsZXIucHJvbWlzZVxyXG4gICAgICAgIH0pLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAkdGltZW91dC5jYW5jZWwoY2FuY2VsVGltZW91dCk7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5jYWxsYmFjayA9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICBvcHRpb25zLmNhbGxiYWNrKGRhdGEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSkuZXJyb3IoZnVuY3Rpb24obWVzc2FnZSwgc3RhdHVzKSB7XHJcbiAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChjYW5jZWxUaW1lb3V0KTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5lcnJvckhhbmRsZXIgPT0gJ2Z1bmN0aW9uJyAmJiBvcHRpb25zLmVycm9ySGFuZGxlcihtZXNzYWdlLCBzdGF0dXMpKSB7XHJcbiAgICAgICAgICAgICAgICAvL0Vycm9yIHdhcyBoYW5kbGVkIGJ5IHRoZSBjdXN0b20gZXJyb3IgaGFuZGxlclxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIXN0YXR1cykge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFcnJvciB3aXRob3V0IHN0YXR1czsgcmVxdWVzdCBhYm9ydGVkP1wiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgY2FuY2VsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIGNhbmNlbGVyLnJlc29sdmUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgfTtcclxuXHJcbn0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKVxyXG4gICAgLmNvbnRyb2xsZXIoJ0xldmVsQ3RybCcsIGZ1bmN0aW9uKCRyb290U2NvcGUsICRzdGF0ZSwgQXBpLCAkdGltZW91dCwgJHN0YXRlUGFyYW1zKSB7XHJcbiAgICAgICAgdmFyIHNjb3BlID0gdGhpcztcclxuICAgICAgICBzY29wZS5sb2FkaW5nID0gdHJ1ZTtcclxuICAgICAgICBzY29wZS50aW1lciA9IDA7IC8vIGluIE1TXHJcblxyXG4gICAgICAgIHNjb3BlLmNsaXBPcHRpb25zID0ge307XHJcblxyXG4gICAgICAgIHNjb3BlLmxldmVsID0ge307XHJcblxyXG4gICAgICAgIHNjb3BlLmFjdHVhbFBvc2l0aW9uID0gMDtcclxuXHJcbiAgICAgICAgc2NvcGUudmlkZW9zID0gW107XHJcblxyXG4gICAgICAgIHNjb3BlLmN1cnJlbnRBbnN3ZXJzID0gW107XHJcblxyXG4gICAgICAgIHNjb3BlLmN1cnJlbnRBbnN3ZXJzTG9hZGVkID0gZmFsc2U7XHJcblxyXG4gICAgICAgIHNjb3BlLnBlcmNlbnRUaW1lckxlZnQgPSAxMDA7XHJcbiAgICAgICAgc2NvcGUucG90ZW50aWFsUG9pbnRzID0gMzAwO1xyXG5cclxuICAgICAgICBzY29wZS51c2VyU2NvcmUgPSAwO1xyXG5cclxuICAgICAgICBzY29wZS5jdXJyZW50QW5zd2Vyc0xvYWRlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICBzY29wZS5wb3B1cCA9IHtcclxuICAgICAgICAgICAgdmlzaWJsZTogZmFsc2UsXHJcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgIC8vIHF1aXp6OiB7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgY2hhbm5lbDogJ3dhbmtpbCcsXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgZ2lmczoge1xyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBjb3JyZWN0OiA4LFxyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICB3cm9uZzogNFxyXG4gICAgICAgICAgICAgICAgLy8gICAgIH0sXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgbGV2ZWxfY291bnQ6IDEwXHJcbiAgICAgICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGluZm9zOiB7XHJcbiAgICAgICAgICAgICAgICBhbnN3ZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICBwb2ludHM6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgaXNfY29ycmVjdDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBuZXh0OiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgZW5kX2dhbWU6IHt9LFxyXG4gICAgICAgICAgICAgICAgdHlwZTogJ2Fuc3dlcidcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUucXVpenpJbmZvcyA9IHt9O1xyXG5cclxuICAgICAgICBzY29wZS5pbml0Q2xpcCA9IGZ1bmN0aW9uKHBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLmJsdXJBbnN3ZXJzKCk7XHJcbiAgICAgICAgICAgIGNsaXAgPSBzY29wZS5sZXZlbC5jbGlwc1twb3NpdGlvbl07XHJcbiAgICAgICAgICAgIHNjb3BlLmNsaXBPcHRpb25zID0gY2xpcDtcclxuICAgICAgICAgICAgc2NvcGUuYWN0dWFsUG9zaXRpb24gPSBwb3NpdGlvbjtcclxuICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnY2xpcENoYW5nZWQnLCBjbGlwKTtcclxuICAgICAgICAgICAgc2NvcGUuaXNUaW1lVXAgPSBmYWxzZTtcclxuICAgICAgICAgICAgaWYgKHBvc2l0aW9uICE9IDApIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLmluaXRBbnN3ZXJzKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHNjb3BlLnJlc2V0VGltZXIoKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgc2NvcGUubmV4dENsaXAgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgYWN0dWFsUG9zaXRpb24gPSBzY29wZS5hY3R1YWxQb3NpdGlvbjtcclxuICAgICAgICAgICAgaWYgKGFjdHVhbFBvc2l0aW9uICsgMSA8IDUpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLmN1cnJlbnRBbnN3ZXJzTG9hZGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5pbml0Q2xpcChhY3R1YWxQb3NpdGlvbiArIDEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5pbml0VmlkZW9zID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIC8vVE9ETyA6IGRvIGl0IHZpYSBpbnRlcm5hbCBBUElcclxuICAgICAgICAgICAgLy9UT0RPIDogcmVtb3ZlIGN1cnJlbnQgY2xpcCBmb3IgcmVzdWx0IGlmXHJcbiAgICAgICAgICAgIEFwaS5jYWxsKHtcclxuICAgICAgICAgICAgICAgIHVybDogJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3lvdXR1YmUvdjMvc2VhcmNoP2tleT1BSXphU3lCTURyVmhtaVIyQXYzY0JmbTJfUk03WFZ2RDZ1ZEx3dW8mY2hhbm5lbElkPScgKyBzY29wZS5xdWl6ekluZm9zLmNoYW5uZWxfeW91dHViZV9JRCArICcmcGFydD1zbmlwcGV0Jm9yZGVyPWRhdGUmbWF4UmVzdWx0cz01MCZ0eXBlPXZpZGVvJyxcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24ocmVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudmlkZW9zID0gcmVzLml0ZW1zO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmluaXRBbnN3ZXJzKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNjb3BlLmluaXRMZXZlbCA9IGZ1bmN0aW9uKGxldmVsKSB7XHJcbiAgICAgICAgICAgIEFwaS5jYWxsKHtcclxuICAgICAgICAgICAgICAgIHVybDogJ2xldmVsLycgKyAkc3RhdGVQYXJhbXMuY2hhbm5lbCArICcvJyArICRzdGF0ZVBhcmFtcy5sZXZlbF9pZCxcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbihyZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXMuc3RhdHVzID09IFwic3VjY2Vzc1wiICYmIHJlcy5kYXRhLmxldmVsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmxldmVsID0gcmVzLmRhdGEubGV2ZWw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnF1aXp6SW5mb3MgPSByZXMuZGF0YS5pbmZvcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUucG9wdXAub3B0aW9ucy5xdWl6eiA9IHJlcy5kYXRhLmluZm9zO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhzY29wZS5wb3B1cCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmluaXRDbGlwKDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5pbml0VmlkZW9zKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzLm1lc3NhZ2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5kZWxldGVBbnN3ZXJzID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLmN1cnJlbnRBbnN3ZXJzID0gW107XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5yYW5kb21pemVWaWRlb3MgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUudmlkZW9zID0gc2NvcGUuc2h1ZmZsZShzY29wZS52aWRlb3MpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUuc2h1ZmZsZSA9IGZ1bmN0aW9uKGEpIHtcclxuICAgICAgICAgICAgdmFyIGosIHgsIGk7XHJcbiAgICAgICAgICAgIGZvciAoaSA9IGEubGVuZ3RoOyBpOyBpLS0pIHtcclxuICAgICAgICAgICAgICAgIGogPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBpKTtcclxuICAgICAgICAgICAgICAgIHggPSBhW2kgLSAxXTtcclxuICAgICAgICAgICAgICAgIGFbaSAtIDFdID0gYVtqXTtcclxuICAgICAgICAgICAgICAgIGFbal0gPSB4O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBhO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUuaW5pdEFuc3dlcnMgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgLy9UT0RPIDogZG8gdGhpcyBtdWNoIGJldHRlciwgZHVtYi1kdW1iXHJcbiAgICAgICAgICAgIHNjb3BlLmN1cnJlbnRBbnN3ZXJzTG9hZGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHNjb3BlLnJhbmRvbWl6ZVZpZGVvcygpO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDM7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgc2NvcGUuY3VycmVudEFuc3dlcnNbaV0gPSBzY29wZS52aWRlb3NbaV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2NvcGUuY3VycmVudEFuc3dlcnNbM10gPSB7XHJcbiAgICAgICAgICAgICAgICBpZDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHZpZGVvSWQ6IHNjb3BlLmxldmVsLmNsaXBzW3Njb3BlLmFjdHVhbFBvc2l0aW9uXS52aWRlb19pZFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHNuaXBwZXQ6IHtcclxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogc2NvcGUubGV2ZWwuY2xpcHNbc2NvcGUuYWN0dWFsUG9zaXRpb25dLnRpdGxlLFxyXG4gICAgICAgICAgICAgICAgICAgIHRodW1ibmFpbHM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWVkaXVtOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6IHNjb3BlLmxldmVsLmNsaXBzW3Njb3BlLmFjdHVhbFBvc2l0aW9uXS50aHVtYm5haWxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzY29wZS5jdXJyZW50QW5zd2VycyA9IHNjb3BlLnNodWZmbGUoc2NvcGUuY3VycmVudEFuc3dlcnMpO1xyXG4gICAgICAgICAgICBzY29wZS5jdXJyZW50QW5zd2Vyc0xvYWRlZCA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICAkdGltZW91dChzY29wZS51bmJsdXIsIDEwMDApO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhzY29wZS5jdXJyZW50QW5zd2Vycyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS51bmJsdXIgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2NvcGUudW5ibHVyQW5zd2VycyA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5ibHVyQW5zd2VycyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBzY29wZS51bmJsdXJBbnN3ZXJzID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNjb3BlLmFuc3dlciA9IGZ1bmN0aW9uKGEpIHtcclxuICAgICAgICAgICAgc2NvcGUuc3RvcFRpbWVyKCk7XHJcblxyXG4gICAgICAgICAgICBjdXJyZW50X2NsaXBfaWQgPSBzY29wZS5sZXZlbC5jbGlwc1tzY29wZS5hY3R1YWxQb3NpdGlvbl0udmlkZW9faWQ7XHJcbiAgICAgICAgICAgIGlmIChjdXJyZW50X2NsaXBfaWQgPT0gYSkge1xyXG4gICAgICAgICAgICAgICAgaXNfY29ycmVjdCA9IHRydWU7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpc19jb3JyZWN0ID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZ2FpbmVkUG9pbnRzID0gc2NvcGUudXBkYXRlVXNlclNjb3JlKGlzX2NvcnJlY3QpO1xyXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCdhbnN3ZXJHaXZlbicsIHtcclxuICAgICAgICAgICAgICAgIGlzX2NvcnJlY3Q6IGlzX2NvcnJlY3QsXHJcbiAgICAgICAgICAgICAgICBwb2ludHM6IGdhaW5lZFBvaW50cyxcclxuICAgICAgICAgICAgICAgIG5leHQ6IHRydWVcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIC8vIHNjb3BlLm5leHRDbGlwKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5zdGFydFRpbWVyID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLnRpbWVyID0gMDtcclxuICAgICAgICAgICAgc2NvcGUudGltZXJUaW1lb3V0ID0gJHRpbWVvdXQoc2NvcGUub25UaW1lb3V0LCAxMDApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUucmVzZXRUaW1lciA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBzY29wZS5zdG9wVGltZXIoKTtcclxuICAgICAgICAgICAgc2NvcGUudGltZXIgPSAwO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUub25UaW1lb3V0ID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIC8vIFRPRE8gOiBnZXQgcmlkIG9mIHRoaXNcclxuICAgICAgICAgICAgaWYgKHNjb3BlLnRpbWVyID49IHNjb3BlLmdldENob2ljZUR1cmF0b24oKSkge1xyXG4gICAgICAgICAgICAgICAgc2NvcGUudGltZUlzVXAoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzY29wZS50aW1lcisrO1xyXG4gICAgICAgICAgICBzY29wZS51cGRhdGVVSSgpO1xyXG4gICAgICAgICAgICBzY29wZS50aW1lclRpbWVvdXQgPSAkdGltZW91dChzY29wZS5vblRpbWVvdXQsIDEwMCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS51cGRhdGVQZXJjZW50VGltZXJMZWZ0ID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIC8vVE9ETyA6IG1ha2UgaXQgbGVzcyBmcmVxdWVudFxyXG4gICAgICAgICAgICBzY29wZS5wZXJjZW50VGltZXJMZWZ0ID0gKHNjb3BlLmdldENob2ljZUR1cmF0b24oKSAtIChzY29wZS50aW1lcikpIC8gc2NvcGUuZ2V0Q2hvaWNlRHVyYXRvbigpICogMTAwO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhzY29wZS5wZXJjZW50VGltZXJMZWZ0KTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBzY29wZS51cGRhdGVVSSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBzY29wZS51cGRhdGVQZXJjZW50VGltZXJMZWZ0KCk7XHJcbiAgICAgICAgICAgIHNjb3BlLnVwZGF0ZVBvdGVudGlhbFBvaW50cygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUuY2FsY3VsYXRlUG90ZW50aWFsUG9pbnRzID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIC8vVE9ETyA6IGNhbGN1bGF0ZSBhY2NvcmRpbmdseSB0byB0aGUgbGV2ZWxcclxuICAgICAgICAgICAgdmFyIHBvaW50c0ZvclRoaXNDbGlwID0gMzAwOyAvLyBUT0RPIDogZ2V0IHBvaW50cyBmb3IgYSBjbGlwICFcclxuICAgICAgICAgICAgcG90ZW50aWFsUG9pbnRzID0gTWF0aC5yb3VuZChwb2ludHNGb3JUaGlzQ2xpcCAtIHNjb3BlLnRpbWVyICogKHBvaW50c0ZvclRoaXNDbGlwIC8gc2NvcGUuZ2V0Q2hvaWNlRHVyYXRvbigpKSk7XHJcbiAgICAgICAgICAgIHJldHVybiBwb3RlbnRpYWxQb2ludHM7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUuZ2V0U2NvcmUgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIHBvdGVudGlhbFBvaW50cyA9IHNjb3BlLmNhbGN1bGF0ZVBvdGVudGlhbFBvaW50cygpO1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgcG90ZW50aWFsUG9pbnRzOiBwb3RlbnRpYWxQb2ludHMsXHJcbiAgICAgICAgICAgICAgICB3cm9uZ1BvaW50czogc2NvcGUuaXNUaW1lVXAgPyAtKHNjb3BlLmxldmVsLmNsaXBfcG9pbnRzIC8gMikgOiBNYXRoLnJvdW5kKC1NYXRoLmFicyhwb3RlbnRpYWxQb2ludHMpIC8gMS41KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5nZXRDaG9pY2VEdXJhdG9uID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBudW1iZXJPZkxldmVscyA9IHNjb3BlLnF1aXp6SW5mb3MubGV2ZWxzX2NvdW50O1xyXG4gICAgICAgICAgICB2YXIgbWluQ2hvaWNlRHVyYXRpb24gPSAxMCAqIDEwOyAvLzEwIHNlY1xyXG4gICAgICAgICAgICB2YXIgbWF4Q2hvaWNlRHVyYXRpb24gPSAzMCAqIDEwOyAvLyAzMCBzZWNcclxuICAgICAgICAgICAgdmFyIGN1cnJlbnRMZXZlbCA9IHNjb3BlLmxldmVsLm51bWJlcjsgLy8gVE9ETyA6IGdldCBjdXJyZW50IGxldmVsXHJcblxyXG4gICAgICAgICAgICBiID0gKG1pbkNob2ljZUR1cmF0aW9uIC0gbWF4Q2hvaWNlRHVyYXRpb24pIC8gKG51bWJlck9mTGV2ZWxzIC0gMSk7XHJcbiAgICAgICAgICAgIGMgPSBiICogKGN1cnJlbnRMZXZlbCAtIDEpICsgbWF4Q2hvaWNlRHVyYXRpb247XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGMpO1xyXG4gICAgICAgICAgICByZXR1cm4gYztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLnN0b3BUaW1lciA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAkdGltZW91dC5jYW5jZWwoc2NvcGUudGltZXJUaW1lb3V0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLnRpbWVJc1VwID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLmlzVGltZVVwID0gdHJ1ZTtcclxuICAgICAgICAgICAgc2NvcGUuc3RvcFRpbWVyKCk7XHJcbiAgICAgICAgICAgIHNjb3BlLnVwZGF0ZVVzZXJTY29yZShmYWxzZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS51cGRhdGVVc2VyU2NvcmUgPSBmdW5jdGlvbihpc19jb3JyZWN0KSB7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwidXBkYXRlVXNlclNjb3JlXCIpO1xyXG4gICAgICAgICAgICBzY29yZSA9IHNjb3BlLmdldFNjb3JlKCk7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHNjb3JlKTtcclxuICAgICAgICAgICAgaWYgKGlzX2NvcnJlY3QpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLnVzZXJTY29yZSA9IHNjb3BlLnVzZXJTY29yZSArIHNjb3JlLnBvdGVudGlhbFBvaW50cztcclxuICAgICAgICAgICAgICAgIHJldHVybiBzY29yZS5wb3RlbnRpYWxQb2ludHM7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyU2NvcmUgPSBzY29wZS51c2VyU2NvcmUgKyBzY29yZS53cm9uZ1BvaW50cztcclxuICAgICAgICAgICAgICAgIHJldHVybiBzY29yZS53cm9uZ1BvaW50cztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUudXBkYXRlUG90ZW50aWFsUG9pbnRzID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLnBvdGVudGlhbFBvaW50cyA9IHNjb3BlLmNhbGN1bGF0ZVBvdGVudGlhbFBvaW50cygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgJHJvb3RTY29wZS4kb24oJ25leHRDbGlwJywgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZTpuZXh0Q2xpcCcpO1xyXG4gICAgICAgICAgICBzY29wZS5uZXh0Q2xpcCgpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkcm9vdFNjb3BlLiRvbignY2xpcFN0YXJ0ZWQnLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZTpjbGlwU3RhcnRlZFwiKTtcclxuICAgICAgICAgICAgc2NvcGUuc3RhcnRUaW1lcigpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBzY29wZS5pbml0TGV2ZWwoKTtcclxuXHJcbiAgICB9KTsiXX0=
