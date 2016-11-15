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