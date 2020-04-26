const express = require("express");
const bodyParser = require("body-parser");

const mongoose = require('mongoose');

const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

mongoose.connect('mongodb://localhost:27017/todolistDB', {
//Estää DepreciationWarnings
  useNewUrlParser: true,
  useUnifiedTopology: true
});

//Kokoelma(Collection), joka tallentaa lisätyt esineet
const itemsSchema = {
  name: {
    type: String,
    required: true
  },
  checked: Boolean
};
const Item = mongoose.model("Item", itemsSchema);

//Kokoelma, joka tallenta luettelot ja niiden esineet
const listsSchema = {
  name: {
    type: String,
    required: true
  },
  items: [itemsSchema]
};

const List = mongoose.model("List", listsSchema);

const item1 = new Item({
  name: "Hit + to add an item"
});

const item2 = new Item({
  name: "Checked items move to the completed list"
});

//Lisää se kun esine voidaan poistaa
// const defaultItems = [item1, item2];
// Item.countDocuments({}, function(err, count) {
//   if (count === 0) {
//     Item.insertMany(defaultItems, function(err) {
//       if (err) {
//         console.log(err);
//       }
//     });
//   }
// });

app.get("/", function(req, res) {

  Item.find({}, function(err, items) {
    res.render("list", {
      listTitle: "To do",
      newListItems: items
    });
  });

});

//On tarkea etta about sivun get pyynnööt käsittellään ennen kuin mukautettu luettelo on käsitelty
app.get("/about", function(req, res) {
  res.render("about");
});

//Tämä uusi luettelo tai näyttää olemassa olevan luettelo
app.get("/:customListName", function(req, res) {
  const customListName = _.capitalize(req.params.customListName);
  List.findOne({
    name: customListName
  }, function(err, foundList) {
    if (!err) {
      if (!foundList) {
        const list = new List({
          name: customListName,
          items: []
        });

        list.save();
        res.redirect("/" + customListName);
      } else {
        // console.log(foundList);
        res.render("list", {
          listTitle: foundList.name,
          newListItems: foundList.items
        });
      }

    } else {
      console.log(err);
    }
  });

});

//Tämä lisätä uusi dokumentti Items kokoelmassa tai päivittää sen Lists kokoelmaan
app.post("/", function(req, res) {

  const listName = req.body.list;
  const item = new Item({
    name: req.body.newItem,
    checked: false
  });

  if (listName === "To do") {
    item.save(function(err) {
      if (err) {
        console.log(err);
      }
    });
    res.redirect("/");
  } else {
    List.findOne({
      name: listName
    }, function(err, foundList) {
      if (!err) {
        foundList.items.push(item);
        foundList.save();
        res.redirect("/" + listName);
      }
    });
  }
});

//Kaikki Poista, kumoa ja valmista pyynnööt on käsiteltävä ensin tai muuten se
// aiheuttaa virhe koska post metodi /:customListName olettaa etta delete tai muut
// pyynöt ovat mukautetun luottelon nimet
// Siirtäminen tehtäväluettelon ja täydellisen luettelon välillä
app.post("/toggle", function(req, res) {
  const toggle = (req.body.checked === "true");
  const listName = req.body.list;
  if (listName === "To do") {
    Item.findByIdAndUpdate(
      req.body.itemId, {
        checked: toggle
      },
      function(err) {
        if (err) {
          console.log(err);
        }
      });
    res.redirect("/");
  } else {
// Kokoelman taulukon kentän päivittäminen
    List.updateOne({
        name: listName,
        "items._id": req.body.itemId
      }, {
        '$set': {
          'items.$.checked': toggle
        }

      },
      function(err) {
        if (err) {
          console.log(err);
        }
      });
    res.redirect("/" + listName);
  }

});

//Poistaa mukautetun luottelon tai tyhjentää tehtäväluetteloon
app.post("/delete", function(req, res) {
  const listName = req.body.list;
  if (listName === "To do") {
    Item.deleteMany({},
      function(err) {
        if (err) {
          console.log(err);
        }
      });
  } else {
    List.deleteOne({
        name: listName
      },
      function(err) {
        if(err) {
          console.log(err);
        }
      });
  }
  res.redirect("/");
});

//Poistaa mukautetun luettelon tai tyhjentää tehtäväluettelon
app.post("/:customListName", function(req, res) {

  // const item = req.body.newItem;
  List.findOne({
    name: customListName
  }, function(err, foundList) {
    if (!err) {
      if (!foundList) {
        foundList.items.push(req.body.newItem);
        List.findByIdAndUpdate({
          id: foundList.id
        }, {
          items: foundList.items,
          function(err) {
            if (err) {
              console.log(err);
            }
          }
        });
      }
    } else {
      console.log(err);
    }
  });

  res.redirect("/");
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
