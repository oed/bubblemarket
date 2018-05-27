var r = 780,
    format = d3.format(",d"),
    fill = d3.scale.category20c();

// Returns a flattened hierarchy containing all leaf nodes under the root.
function classes(root) {
  var classes = [];
  function recurse(name, node) {
    if (node.children) node.children.forEach(function(child) { recurse(node.name, child); });
    else classes.push({packageName: node.address, className: node.name, value: node.size});
  }
  recurse(null, root);
  return {children: classes};
}

var bubble = d3.layout.pack()
    .sort(null)
    .size([r, r]);

var vis = d3.select("#chart").append("svg:svg")
    .attr("width", r)
    .attr("height", r)
    .attr("class", "bubble");

function draw () {
  var node = vis.selectAll("g.node").remove()
  var node = vis.selectAll("g.node")
      .data(bubble.nodes(classes(data))
        .filter(function(d) { return !d.children; }))
    .enter().append("svg:g")
      .attr("class", "node")
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

  node.append("svg:title")
      .text(function(d) { return d.className + ": " + format(d.value); });

  node.append("svg:circle")
      .on("click", node => populateCurve(node.packageName))
      .attr("r", function(d) { return d.r; })
      .style("fill", function(d) { return fill(d.packageName); });

  node.append("svg:text")
      .attr("text-anchor", "middle")
      .attr("dy", ".3em")
      .on("click", node => populateCurve(node.packageName))
      .text(function(d) { return d.className.substring(0, d.r / 3); });
}


//draw()
function createBubble () {
  const name = d3.select("#bname")[0][0].value
  const url = d3.select("#burl")[0][0].value
  ethPolyFactory.newCurve(name, url, (e, txHash) => {
    const waitForReceipt = (e, r) => {
      if (r) {
        const tokenAddr = '0x' + r.logs[0].data.slice(26, 66)
        populateCurve(tokenAddr)
        update()
      } else {
        web3.eth.getTransactionReceipt(txHash, waitForReceipt)
      }
    }
    web3.eth.getTransactionReceipt(txHash, waitForReceipt)
  })
}

let data
function update () {
  const events = ethPolyFactory.allEvents({fromBlock: 0, toBlock: 'latest'})
  data = { children: [] }
  events.watch((e, event) => {
    let address = event.args.token
    const btoken = ethpolynomialcurvedtokenContract.at(address)
    btoken.name.call((e, name) => {
      btoken.symbol.call((e, url) => {
        btoken.totalSupply.call((e, totalSupply) => {
          data.children.push({
            name,
            url,
            address,
            size: totalSupply > 10 ? totalSupply : 10
          })
          draw()
        })
      })
    })
  })
}

function populateCurve (address) {
  const btoken = ethpolynomialcurvedtokenContract.at(address)
  btoken.name.call((e, name) => { d3.select("#name")[0][0].innerHTML = name })
  btoken.symbol.call((e, url) => { d3.select("#url")[0][0].innerHTML = '<a target="_blank" href="' + url + '">' + url + '</a>' })
  btoken.totalSupply.call((e, totalSupply) => { d3.select("#supply")[0][0].innerHTML = totalSupply })
  web3.eth.getCoinbase((e, address) => {
    btoken.balanceOf.call(address, (e, balance) => { d3.select("#balance")[0][0].innerHTML = balance.toNumber() })
  })
  let b = d3.select("#buyorsell")[0][0].style.display = 'block'
  d3.select("#buyTok").on("click", () => buy(btoken, address));
  d3.select("#sellTok").on("click", () => sell(btoken, address));

  d3.select("#bnumTokens").on("change", () => {
    btoken.priceToMint.call(d3.select("#bnumTokens")[0][0].value, (e, price) => {
      d3.select("#bprice")[0][0].value = price ? price.toNumber() : null
    })
  })
  d3.select("#snumTokens").on("change", () => {
    btoken.rewardForBurn.call(d3.select("#snumTokens")[0][0].value, (e, price) => {
      d3.select("#sprice")[0][0].value = price ? price.toNumber() : null
    })
  })
}

function buy (btoken, address) {
  const numTokens = d3.select("#bnumTokens")[0][0].value
  console.log('buy', numTokens)
  const price = d3.select("#bprice")[0][0].value
  btoken.mint(numTokens, {value: price}, (e, txHash) => {
    // TODO - wait for mined
    populateCurve(address)
  })
}
function sell (btoken, address) {
  const numTokens = d3.select("#snumTokens")[0][0].value
  console.log('sell', numTokens)
  const price = d3.select("#sprice")[0][0].value
  btoken.burn(numTokens, (e, txHash) => {
    // TODO - wait for mined
    populateCurve(address)
  })
}

d3.select("#newBubble").on("click", createBubble);
d3.select("#update").on("click", update);

const ethpolyfactoryContract = web3.eth.contract([{"constant":false,"inputs":[{"name":"name","type":"string"},{"name":"url","type":"string"}],"name":"newCurve","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"anonymous":false,"inputs":[{"indexed":false,"name":"token","type":"address"}],"name":"NewCurve","type":"event"}]);
const ethpolynomialcurvedtokenContract = web3.eth.contract([{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"balances","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"numTokens","type":"uint256"}],"name":"burn","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"exponent","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"allowed","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"poolBalance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"numTokens","type":"uint256"}],"name":"mint","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"numTokens","type":"uint256"}],"name":"priceToMint","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"numTokens","type":"uint256"}],"name":"rewardForBurn","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"remaining","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[{"name":"name","type":"string"},{"name":"decimals","type":"uint8"},{"name":"symbol","type":"string"},{"name":"_exponent","type":"uint8"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"amount","type":"uint256"},{"indexed":false,"name":"totalCost","type":"uint256"}],"name":"Minted","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"amount","type":"uint256"},{"indexed":false,"name":"reward","type":"uint256"}],"name":"Burned","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_from","type":"address"},{"indexed":true,"name":"_to","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_owner","type":"address"},{"indexed":true,"name":"_spender","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"Approval","type":"event"}]);

//const ethPolyFactory = ethpolyfactoryContract.at("0x432472827C271b795402cd385DF9F425d0bf1cFe")
const ethPolyFactory = ethpolyfactoryContract.at("0x9bdd490174c70954fbbfcfec99a953f29790a4d4") // rinkeby
update()
