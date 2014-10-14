var attendanceApp = angular.module('diary', ['ui.bootstrap']);

function dayOfWeekAsString(dayIndex) {
  return ["Sunday", "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"][dayIndex];
}

function monthAsString(monthIndex) {
	return ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][monthIndex];
}

function getOrdinand(date) {
	if (date == 1 || date == 21 || date == 31) {
		return "st";
	} else if (date == 2 || date == 22) {
		return "nd";
	} else if (date == 3 || date == 23) {
		return "rd";
	} else {
		return "th";
	}
}

Date.prototype.getWeekNumber = function(){
    var d = new Date(+this);
    d.setHours(0,0,0);
    d.setDate(d.getDate()+4-(d.getDay()||7));
    return Math.ceil((((d-new Date(d.getFullYear(),0,1))/8.64e7)+1)/7);
};

attendanceApp.config(['$httpProvider', function($httpProvider) {
      $httpProvider.defaults.headers.common["X-Requested-With"] = 'XMLHttpRequest';
  }]);

function getMonday(d) {
	var dif = (d.getDay() + 6) % 7; // Number of days to subtract 
	return new Date(d - dif * 24*60*60*1000); // Do the subtraction 
}

function getSunday(d) {
	if (d.getDay() == 0) return new Date(d); //If we're already Sunday then do nothing
	return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay() + 7);
}

function getQueryString(year, month) {
	var firstday = getMonday(new Date(year, month, 1));
	var lastday = getSunday(new Date(year, month+1, 0, 0,0,0,0));
	return "/"+firstday.getFullYear()+'-'+(firstday.getMonth()+1)+'-'+firstday.getDate() + '--'
		+ lastday.getFullYear()+'-'+(lastday.getMonth()+1)+'-'+lastday.getDate();
}

attendanceApp.controller('DiaryCtrl', function ($scope, $http) {
	$scope.events = new Array();
	$scope.date = "";
	var today = new Date();
	$scope.monthString = monthAsString(today.getMonth()) + " " + today.getFullYear(); 
	$scope.nextmonth = function() {
		if ($scope.month == 'diary' || $scope.year == 'diary') {
			$scope.month = today.getMonth();
			$scope.year = today.getFullYear();
		}
		if ($scope.month == 11) {
			$scope.month = 0;
			$scope.year += 1;
		} else {
			$scope.month += 1;
		}
		$scope.date = getQueryString($scope.year, $scope.month);
		$scope.monthString = monthAsString($scope.month) + " " + $scope.year;
		$scope.reload();
	}
	$scope.thismonth = function() {
		var firstday = getMonday(today);
		var lastday = getSunday(new Date(today.getFullYear(), today.getMonth()+1, 0, 0,0,0,0));
		$scope.date = "/"+firstday.getFullYear()+"-"+(firstday.getMonth()+1)+"-"+firstday.getDate()+"--"
			+ lastday.getFullYear()+'-'+(lastday.getMonth()+1)+'-'+lastday.getDate();
		$scope.month = today.getMonth(); 
		$scope.year = today.getFullYear();
		$scope.monthString = monthAsString(today.getMonth()) + " " + today.getFullYear(); 
		$scope.reload();
	}
	$scope.prevmonth = function() {
		if ($scope.month == 'diary' || $scope.year == 'diary') {
			$scope.month = today.getMonth();
			$scope.year = today.getFullYear();
		}
		if ($scope.month == 0) {
			$scope.month = 11;
			$scope.year -= 1;
		} else {
			$scope.month -= 1;
		}
		$scope.date = getQueryString($scope.year, $scope.month);
		$scope.monthString = monthAsString($scope.month) + " " + $scope.year;
		$scope.reload();
	}
	$scope.reload = function() {
	var url = '/diary/json' + $scope.date;
	$http.get(url).success(function($data) {
			$scope.events = new Array();
			var today = new Date();
			var weekDesc = '';
			var currentDayOfWeek = 0;
			var currentWeek = 0;
			var dayofweek = 0;
			var thisWeekEvents = new Array();
			var todaysEvents = new Array();
			$data['nodes'].forEach ( function (event) {
				if (event['node']['date'] != "") {
				var eventDate = new Date(event['node']['date'].split(' ')[0]+"Z");
				var ampm = 'am';
				var hour = eventDate.getUTCHours();
				if (hour >= 12) {
					if (hour != 12) hour -= 12;
					ampm = 'pm';
				}
				if (hour == 0 && eventDate.getUTCMinutes() == 0) {
					event['node']['time'] = "All day";
				} else { 
					event['node']['time'] = hour + 
						':' + ("0" + eventDate.getUTCMinutes())
							.slice(-2) + ampm; 
				}
				dayofweek = eventDate.getDay();
				var weeknumber = eventDate.getWeekNumber();
				var curr = new Date(eventDate);
				var day = (curr.getDay()-1);
				if (day < 0) {
					day = 6;
				} else {
					day %= 7;
				}
				var firstday = new Date(curr.getTime() - 60*60*24* day*1000); //will return firstday (ie monday) of the week
				var lastday = new Date(firstday.getTime() + 60 * 60 *24 * 6 * 1000); //adding (60*60*6*24*1000) means adding six days to the firstday which results in lastday (saturday) of the week 

				if (weekDesc == '') {
					weekDesc = firstday.getDate() + getOrdinand(firstday.getDate()) + " - " + lastday.getDate() + getOrdinand(lastday.getDate()) + " " + monthAsString(lastday.getMonth());
				}
				event['node']['class'] = "day-"+dayOfWeekAsString(dayofweek);
				if (today.getFullYear() == eventDate.getFullYear()
						&& today.getMonth() == eventDate.getMonth()
						&& today.getDate() == eventDate.getDate()) {
					event['node']['class'] += " diary-today"; 
				}
				event['node']['dayofweek'] = dayOfWeekAsString(dayofweek);
				event['node']['datestr'] = eventDate.getDate() + getOrdinand(eventDate.getDate()) + " " + monthAsString(eventDate.getMonth()); 
				if (dayofweek != currentDayOfWeek || weeknumber != currentWeek) {

					if (todaysEvents.length) {
						var col = 'main';
						if (currentDayOfWeek == 0) {
							col = 'sunday';
						}
						if (!angular.isArray(thisWeekEvents[col])) {
							thisWeekEvents[col] = new Array();
						}
						thisWeekEvents[col].push(todaysEvents);
						todaysEvents = new Array();

					}
					currentDayOfWeek = dayofweek;
					if (currentWeek != weeknumber) {
						if (angular.isArray(thisWeekEvents['main']) || angular.isArray(thisWeekEvents['sunday'])) {
							thisWeekEvents['week'] = weekDesc;
							$scope.events.push(thisWeekEvents);
						}
						weekDesc = firstday.getDate() + getOrdinand(firstday.getDate()) + " - " + lastday.getDate() + getOrdinand(lastday.getDate()) + " " + monthAsString(lastday.getMonth());
						thisWeekEvents = new Array();
						currentWeek = weeknumber;
					}
				}
				todaysEvents.push(event);
				}
			});
			if (todaysEvents.length) {
				var col = 'main';
				if (dayofweek == 0) {
					col = 'sunday';
				}
				if (!angular.isArray(thisWeekEvents[col])) {
					thisWeekEvents[col] = new Array();
				}
				thisWeekEvents[col].push(todaysEvents);
			}
			if (angular.isArray(thisWeekEvents['main']) || angular.isArray(thisWeekEvents['sunday'])) {
				thisWeekEvents['week'] = weekDesc;
				$scope.events.push(thisWeekEvents);
			}
		});
	};
	$scope.thismonth();
});
