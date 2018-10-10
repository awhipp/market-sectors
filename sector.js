var IEX_ENDPOINT = "https://api.iextrading.com/1.0";
var SECTOR_ENDPOINT = "/stock/market/sector-performance";
var TICKER_ENDPOINT = "/stock/market/collection/sector?collectionName=";

function convertDataToArry(sectorData) {
  var data = [];
  for (var key in sectorData) {
    if (sectorData.hasOwnProperty(key)) {
      data.push(sectorData[key]);
    }
  }
  for (var i = 0; i < sectorData.length; i++) {
      data.push(sectorData.performance);
  }
  return data;
}

function Sector(data) {
    this.sectors = [];
    this.sectorData = {};
    this.sectorColors = [];
    this.myBar = undefined;
    this.tickerTable =  $("#tickerTable").DataTable( {
        "order": [[ 4, "desc" ]],
        responsive: true,
          "columnDefs": [ {
            "targets": 0,
            "orderable": false
          } ],
        "pageLength": 10
    } );

    $("#tickerTable").on( 'page.dt', function () {
      setTimeout(function(){
        $('tr td:first-child').on('click', function () {
          toggleTab(this);
        });
      }, 500);
    } );

    this.lastSector = undefined;
    this.latestSectorData = undefined;

    for(var i = data.length-1; i >= 0; i--){
      this.sectors.push(data[i].name);
      this.sectorData[data[i].name] = ((data[i].performance*100).toFixed(2));
      this.sectorColors.push(Samples.utils.getSectorColor(data[i].performance*100));
    }

    this.createChart();
}


Sector.prototype.createChart = function(){
  var color = Chart.helpers.color;
  var barChartData = {
    labels: this.sectors,
    datasets: [{
      backgroundColor: this.sectorColors,
      borderColor: window.chartColors.black,
      borderWidth: 1,
      data: convertDataToArry(this.sectorData)
    }]
  };

  var thiz = this;
  $(".loaderHolder").fadeOut().promise().then(function(){
    var ctx = document.getElementById('canvas').getContext('2d');
    thiz.myBar = new Chart(ctx, {
      type: 'bar',
      data: barChartData,
      options: {
        responsive: true,
        tooltips: { enabled: false },
        hover: { mode: null },
        legend: { display: false },
        title: {
          display: false
        },
        onClick: function(c,i) {
          $(".loaderHolder").fadeIn();
          e = i[0];
          if(e) {
            var indexVal = e._index;
            var x_value = this.data.labels[e._index];
            var y_value = this.data.datasets[0].data[e._index];
            getSectorTickers(x_value);
          } else {
            $(".loaderHolder").hide();
          }
        },
        hover: { "animationDuration": 1 },
        "animation": {
          "duration": 1,
          "onComplete": function() {
            var chartInstance = this.chart,
            ctx = chartInstance.ctx;
            ctx.font = Chart.helpers.fontString(Chart.defaults.global.defaultFontSize, Chart.defaults.global.defaultFontStyle, Chart.defaults.global.defaultFontFamily);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';

            this.data.datasets.forEach(function(dataset, i) {
              var meta = chartInstance.controller.getDatasetMeta(i);
              meta.data.forEach(function(bar, index) {
                var data = dataset.data[index];
                if(data >= 0) {
                  ctx.fillText(data + "%", bar._model.x, bar._model.y - 0);
                } else {
                  ctx.fillText(data + "%", bar._model.x, bar._model.y + 15);
                }
              });
            });
          }
        }
      }
    });
  });

}


Sector.prototype.updateTable = function(data){
  if (this.myBar) {
    for(var i = data.length-1; i >= 0; i--){
      this.sectorData[data[i].name] = ((data[i].performance*100).toFixed(2));
    }
    this.myBar.data.datasets[0].data = convertDataToArry(this.sectorData);
    this.myBar.update();
  }
}

Sector.prototype.addRow = function(row, symbol, idx) {
  var dtRow = this.tickerTable.row.add( row ).draw().node();
  dtRow.dataset["index"] = idx;
  $(dtRow).attr("symbol", symbol);
}

Sector.prototype.drawTable = function() {
  this.tickerTable.draw();
}

Sector.prototype.clearTable = function() {
  this.tickerTable.clear().draw();
}

var detailControl = '<td class="details-control"><i class="fa fa-plus-square" aria-hidden="true"></i></td>';

function getMinimizedTicker(tickerData) {
  var companyName = tickerData.companyName;
  if(companyName.length > 50) {
    companyName = companyName.substring(0,50).trim() + "...";
  }

  var dir = "green";
  var percentChange = (tickerData.changePercent*100).toFixed(2);
  if(percentChange < 0) {
      dir = "red";
  } else if (percentChange == 0) {
      dir = "black";
  }
  return [
    detailControl,
    companyName + "&nbsp;(" + tickerData.symbol + ")",
    "<span class='price'>" + tickerData.iexRealtimePrice + "</span>",
    "<span class='priceChange'>" + tickerData.change + "</span>",
    "<span style='color: "+dir+";' class='percentChange'>" + percentChange + "%</span>",
    tickerData.open,
    "<span class='high'>" + tickerData.high + "</span>",
    "<span class='low'>" + tickerData.low + "</span>",
    tickerData.close,
    "<span class='volume'>" + tickerData.iexVolume + "</span>"
  ];
}

function acceptableTime(tickerUpdate) {
  var today = new Date();
  var diff = Math.round((new Date() - new Date(tickerUpdate))/(1000*60*60*24));
  var offset = today.getDay();
  if (offset == 6) {
    offset = 2; // account for holidays
  } else if (offset == 0) {
    offset = 3; // account for holidays
  } else {
    offset = 1; // account for holidays
  }

  return (diff <= offset);
}


function format(idx){
   // `d` is the original data object for the row
   var company = window.sector.latestSectorData[idx];
   var extraTable = "<table class='extraInfo'>";
   extraTable += "<thead>";
   extraTable += "<tr>";
   extraTable += "<th>Average Daily Volume</th>";
   extraTable += "<th>52W High</th>";
   extraTable += "<th>52W Low</th>";
   extraTable += "<th>YTD Change</th>";
   extraTable += "<th>PE Ratio</th>";
   extraTable += "<th>Market Cap</th>";
   extraTable += "<th>Exchange</th>";
   extraTable += "<th>Last Update</th>";
   extraTable += "</tr>";
   extraTable += "</thead>";

   extraTable += "<tbody>";
   extraTable += "<tr>";
   extraTable += "<td>" + company.avgTotalVolume + "</td>";
   extraTable += "<td class='week52Low'>" + company.week52Low + "</td>";
   extraTable += "<td class='week52High'>" + company.week52High + "</td>";
   extraTable += "<td class='ytdChange'>" + (company.ytdChange*100).toFixed(2) + "%</td>";
   extraTable += "<td>" + company.peRatio + "</td>";
   extraTable += "<td class='marketCap'>" + company.marketCap + "</td>";
   extraTable += "<td>" + company.primaryExchange + "</td>";
   extraTable += "<td class='updateTime'>" + company.latestTime + "</td>";
   extraTable += "</tr>";
   extraTable += "</tbody>";
   extraTable += "</table>";

   return extraTable;
}


function toggleTab(item) {
  var tr = $(item).closest('tr');
  var tdi = tr.find("i.fa");
  var row = window.sector.tickerTable.row(tr);

  if (row.child.isShown()) {
    // This row is already open - close it
    row.child.hide();
    tr.removeClass('shown');
    tdi.first().removeClass('fa-minus-square');
    tdi.first().addClass('fa-plus-square');
  }
  else {
    // Open this row
    var idx = parseInt(row.node().dataset["index"]);
    row.child(format(idx)).show();
    tr.addClass('shown');
    tdi.first().removeClass('fa-plus-square');
    tdi.first().addClass('fa-minus-square');
  }
}

function getSectorTickers(sector) {
  window.sector.lastSector = sector;
  $.ajax({
    url : IEX_ENDPOINT + TICKER_ENDPOINT + sector.replace(" ", "%20"),
    type : "get",
    dataType: "jsonp",
    success : function(data) {
      window.sector.latestSectorData = data;

      $(".tickerHeader").text(sector + " Sector Companies");
      window.sector.clearTable();
      lastIdx = 0;
      for(var i = 0; i < data.length; i++) {
        if(data[i].iexVolume > 0 && acceptableTime(data[i].latestUpdate)) {
          var row = window.sector.addRow(
            getMinimizedTicker(data[i]), data[i].symbol, i
          );
        }
      }
      window.sector.drawTable();
      $(".loaderHolder").fadeOut();
      openTickerBox();

      $('tr td:first-child').on('click', function () {
        toggleTab(this);
      });
    },
    error: function(e) {
      console.log(e);
    }
  });
}

// Get the modal
var tickerModal = document.getElementById('tickerModal');
// Get the <span> element that closes the modal
var closeSpan = document.getElementsByClassName("close")[0];
// When the user clicks on the button, open the modal
function openTickerBox() {
    tickerModal.style.display = "block";
}

function updateSectorTable() {
  if(window.sector && window.sector.lastSector && $("#tickerModal").is(":visible")) {
    $.ajax({
      url : IEX_ENDPOINT + TICKER_ENDPOINT + window.sector.lastSector.replace(" ", "%20"),
      type : "get",
      dataType: "jsonp",
      success : function(data) {
        window.sector.latestSectorData = data;
        for(var i = 0; i < data.length; i++) {
          if(data[i].symbol) {
            var row = $("[symbol='"+data[i].symbol+"']");
            if(row && row[0]) {
              if(row.find(".price")[0].text !== data[i].iexRealtimePrice) {
                row.find(".price")[0].text = data[i].iexRealtimePrice;
                row.find(".priceChange")[0].text = data[i].change;
                row.find(".percentChange")[0].text = (data[i].changePercent*100).toFixed(2);
                row.find(".volume")[0].text = data[i].iexVolume;
                row.find(".high")[0].text = data[i].high;
                row.find(".low")[0].text = data[i].low;
              }
              //row.find(".ytdChange")[0].text = (data[i].ytdChange*100).toFixed(2);
            }
          }
        }
      }

    });
  }
}

$(function(){
  setInterval(function(){
    $.ajax({
      url : IEX_ENDPOINT + SECTOR_ENDPOINT,
      type : "get",
      dataType: "jsonp",
      success : function(data) {
        if(window.sector){
          window.sector.updateTable(data);
        }else{
          window.sector = new Sector(data);
        }
      },
      error: function(e) {
        console.log(e);
      }
    });
  }, 5000);

  setInterval(function(){
    updateSectorTable();
  }, 15000);


  // When the user clicks on <span> (x), close the modal
  closeSpan.onclick = function() {
      tickerModal.style.display = "none";
  }

  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function(event) {
      if (event.target == tickerModal) {
          tickerModal.style.display = "none";
      }
  }

});
