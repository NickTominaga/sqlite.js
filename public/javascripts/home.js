let tablename;
let tableInstance;

async function fetchData() {
  try {
    const response = await fetch(`${window.BASE_URL}/api/tables`);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    populateSidebar(data.data || []);
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

function populateSidebar(tables) {
  const tablesNav = document.querySelector(".tables-nav");

  tables.forEach((table) => {
    if (table.name !== "sqlite_sequence" && table.name !== "query") {
      const item = document.createElement("li");
      item.classList.add("nav-item");

      const button = document.createElement("button");
      button.type = "button";
      button.classList.add("nav-link", "w-100", "text-start", "btn", "btn-link", "px-3");
      button.textContent = table.name;

      button.addEventListener("click", () => {
        tablename = table.name;
        renderTabulatorTable(tablename);
      });

      item.appendChild(button);
      tablesNav.appendChild(item);
    }
  });
}

async function fetchFirstPage(tableName) {
  const response = await fetch(
    `${window.BASE_URL}/api/tables/${tableName}/rows?page=1&perPage=20`
  );
  if (!response.ok) {
    throw new Error("Error fetching table rows");
  }
  return response.json();
}

function buildColumns(rows) {
  if (!rows || rows.length === 0) {
    return [];
  }

  const keys = Object.keys(rows[0]);
  const idLabel = keys[0] || "id";
  const dataColumns = keys.map((key) => ({
    title: key,
    field: key,
    headerSort: false,
  }));

  const actionColumns = [
    {
      title: "Edit",
      formatter: () => '<button class="btn btn-sm btn-outline-primary">Edit</button>',
      hozAlign: "center",
      headerSort: false,
      cellClick: (_e, cell) => {
        const row = cell.getRow().getData();
        window.location.href = `${window.BASE_URL}/edit/${tablename}/${idLabel}/${row[idLabel]}`;
      },
    },
    {
      title: "Delete",
      formatter: () => '<button class="btn btn-sm btn-outline-danger">Delete</button>',
      hozAlign: "center",
      headerSort: false,
      cellClick: async (_e, cell) => {
        const row = cell.getRow().getData();
        if (!window.confirm("Are you sure you want to delete this row")) return;

        const response = await fetch(
          `${window.BASE_URL}/api/tables/${tablename}/rows/${row[idLabel]}?key=${idLabel}`,
          { method: "DELETE" }
        );

        if (!response.ok) {
          window.alert("Failed to delete row");
          return;
        }

        cell.getRow().delete();
      },
    },
  ];

  return [...dataColumns, ...actionColumns];
}

function renderTableHeader(mainBodyDiv) {
  const headerDiv = document.createElement("div");
  headerDiv.classList.add("main_body_header");

  const insertButton = document.createElement("button");
  insertButton.textContent = "Insert";
  insertButton.classList.add("insert_btn");
  insertButton.onclick = () => {
    window.location.href = `${window.BASE_URL}/insert/${tablename}`;
  };
  headerDiv.appendChild(insertButton);

  const deleteButton = document.createElement("button");
  deleteButton.textContent = "Delete table";
  deleteButton.classList.add("delete_btn");
  deleteButton.onclick = async () => {
    if (!window.confirm("Are you sure you want to delete this table")) {
      return;
    }

    const response = await fetch(`${window.BASE_URL}/api/tables/${tablename}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      window.alert("Failed to delete table");
      return;
    }

    window.location.reload();
  };

  headerDiv.appendChild(deleteButton);
  mainBodyDiv.appendChild(headerDiv);

  const tableTitle = document.createElement("h1");
  tableTitle.classList.add("form-label", "fs-4", "text");
  tableTitle.textContent = tablename;
  mainBodyDiv.appendChild(tableTitle);
}

async function renderTabulatorTable(tableName) {
  const mainBodyDiv = document.querySelector(".main_body");
  mainBodyDiv.innerHTML = "";

  renderTableHeader(mainBodyDiv);

  const tableContainer = document.createElement("div");
  tableContainer.id = "tabulator-container";
  mainBodyDiv.appendChild(tableContainer);

  try {
    const firstPageData = await fetchFirstPage(tableName);
    const columns = buildColumns(firstPageData.data || []);

    if (columns.length === 0) {
      const emptyText = document.createElement("h1");
      emptyText.style.color = "black";
      emptyText.style.textAlign = "center";
      emptyText.textContent = "No data available for this table.";
      mainBodyDiv.appendChild(emptyText);
      return;
    }

    tableInstance = new Tabulator("#tabulator-container", {
      layout: "fitColumns",
      pagination: true,
      paginationMode: "remote",
      paginationSize: 20,
      paginationSizeSelector: [10, 20, 50, 100],
      ajaxURL: `${window.BASE_URL}/api/tables/${tableName}/rows`,
      ajaxURLGenerator: function (url, _config, params) {
        return `${url}?page=${params.page}&perPage=${params.size}`;
      },
      ajaxResponse: function (_url, _params, response) {
        if (response.meta) {
          this.setMaxPage(response.meta.totalPages || 1);
        }
        return response.data || [];
      },
      columns,
    });
  } catch (error) {
    console.error("Error rendering table:", error);
  }
}

document.addEventListener("DOMContentLoaded", fetchData);
