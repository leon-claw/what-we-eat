import { Check, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { builtInOptions } from "../data/foodTaxonomy";
import { createId } from "../lib/id";
import type { FoodCategory, FoodOption } from "../types";

export type FoodOptionFormResult = {
  category: FoodCategory;
  option: FoodOption;
};

type DishFormProps = {
  categories: FoodCategory[];
  options: FoodOption[];
  onClose: () => void;
  onSubmit: (result: FoodOptionFormResult) => void;
};

const newCategoryValue = "__new_category__";
const dialogAnimationMs = 220;

export default function DishForm({
  categories,
  options,
  onClose,
  onSubmit,
}: DishFormProps) {
  const firstCategoryId =
    categories.find((category) => category.status === "active")?.id ??
    newCategoryValue;
  const [form, setForm] = useState({
    name: "",
    categoryId: firstCategoryId,
    newCategoryName: "",
    imageUrl: builtInOptions[0]?.imageUrl ?? "",
    tags: "",
    description: "",
    spicyLevel: "",
    priceLevel: "2",
  });
  const [error, setError] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imagePickerClosing, setImagePickerClosing] = useState(false);
  const imageChoices = useMemo(() => {
    const seen = new Set<string>();
    return builtInOptions.filter((option) => {
      if (seen.has(option.imageUrl)) return false;
      seen.add(option.imageUrl);
      return true;
    });
  }, []);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const closeForm = () => {
    if (isClosing) return;
    setIsClosing(true);
    window.setTimeout(onClose, dialogAnimationMs);
  };

  const openImagePicker = () => {
    setImagePickerClosing(false);
    setImagePickerOpen(true);
  };

  const closeImagePicker = () => {
    if (imagePickerClosing) return;
    setImagePickerClosing(true);
    window.setTimeout(() => {
      setImagePickerOpen(false);
      setImagePickerClosing(false);
    }, dialogAnimationMs);
  };

  const selectImage = (imageUrl: string) => {
    updateField("imageUrl", imageUrl);
    closeImagePicker();
  };

  return (
    <div
      className="modal-backdrop dish-form-backdrop"
      data-closing={isClosing}
      role="presentation"
    >
      <form
        className="dish-form"
        data-closing={isClosing}
        onSubmit={(event) => {
          event.preventDefault();

          const optionName = form.name.trim();
          const now = Date.now();
          let category = categories.find(
            (candidate) => candidate.id === form.categoryId,
          );

          if (!optionName) {
            setError("先填写菜品名称。");
            return;
          }

          if (form.categoryId === newCategoryValue) {
            const categoryName = form.newCategoryName.trim();
            if (!categoryName) {
              setError("新分类需要一个名称。");
              return;
            }

            const duplicateCategory = categories.find(
              (candidate) =>
                candidate.name.localeCompare(categoryName, "zh-CN", {
                  sensitivity: "accent",
                }) === 0,
            );
            if (duplicateCategory) {
              setError("这个分类已经存在，请直接从列表中选择。");
              return;
            }

            category = {
              id: createId("category"),
              name: categoryName,
              sortOrder: categories.length,
              status: "active",
              source: "custom",
              createdAt: now,
              updatedAt: now,
            };
          }

          if (!category) {
            setError("请选择一个所属分类。");
            return;
          }

          const duplicateOption = options.some(
            (option) =>
              option.categoryId === category.id &&
              option.status === "active" &&
              option.name.localeCompare(optionName, "zh-CN", {
                sensitivity: "accent",
              }) === 0,
          );
          if (duplicateOption) {
            setError("这个分类里已经有同名菜品。");
            return;
          }

          const tags = form.tags
            .split(/[,，\s]+/)
            .map((tag) => tag.trim())
            .filter(Boolean);
          const spicyLevel = form.spicyLevel
            ? (Number(form.spicyLevel) as NonNullable<
                FoodOption["spicyLevel"]
              >)
            : undefined;

          onSubmit({
            category,
            option: {
              id: createId("option"),
              categoryId: category.id,
              categoryName: category.name,
              parentOptionId: null,
              name: optionName,
              path: [category.name, optionName],
              imageUrl: form.imageUrl.trim(),
              tags,
              description:
                form.description.trim() || `${category.name} · ${optionName}`,
              ...(spicyLevel !== undefined ? { spicyLevel } : {}),
              priceLevel: Number(form.priceLevel) as NonNullable<
                FoodOption["priceLevel"]
              >,
              selectable: true,
              sortOrder: options.filter(
                (option) => option.categoryId === category.id,
              ).length,
              status: "active",
              source: "custom",
              createdAt: now,
              updatedAt: now,
            },
          });
        }}
      >
        <div className="form-header">
          <div>
            <p className="eyebrow">菜品池</p>
            <h2>新增菜品</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={closeForm}
            title="关闭"
            aria-label="关闭新增菜品"
          >
            <X size={20} />
          </button>
        </div>

        <div className="form-grid">
          <label>
            名称
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="例如：椰子鸡火锅"
              autoFocus
            />
          </label>
          <label>
            所属分类
            <select
              value={form.categoryId}
              onChange={(event) =>
                updateField("categoryId", event.target.value)
              }
            >
              {categories
                .filter((category) => category.status === "active")
                .map((category) => (
                  <option value={category.id} key={category.id}>
                    {category.name}
                  </option>
                ))}
              <option value={newCategoryValue}>新建分类</option>
            </select>
          </label>
          {form.categoryId === newCategoryValue ? (
            <label className="form-wide">
              新分类名称
              <input
                value={form.newCategoryName}
                onChange={(event) =>
                  updateField("newCategoryName", event.target.value)
                }
                placeholder="例如：海南菜"
              />
            </label>
          ) : null}
          <div className="form-wide image-choice-field">
            <div className="field-label">图片</div>
            <div className="selected-image-row">
              <div
                className="selected-image-preview"
                aria-label="当前选择的菜品图片"
              >
                <img src={form.imageUrl} alt="" />
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={openImagePicker}
              >
                选择图片
              </button>
            </div>
          </div>
          <label>
            辣度
            <select
              value={form.spicyLevel}
              onChange={(event) =>
                updateField("spicyLevel", event.target.value)
              }
            >
              <option value="">不标注</option>
              <option value="0">不辣</option>
              <option value="1">微辣</option>
              <option value="2">中辣</option>
              <option value="3">重辣</option>
            </select>
          </label>
          <label>
            价格
            <select
              value={form.priceLevel}
              onChange={(event) =>
                updateField("priceLevel", event.target.value)
              }
            >
              <option value="1">¥</option>
              <option value="2">¥¥</option>
              <option value="3">¥¥¥</option>
            </select>
          </label>
          <label className="form-wide">
            标签
            <input
              value={form.tags}
              onChange={(event) => updateField("tags", event.target.value)}
              placeholder="夜宵, 清爽, 聚餐"
            />
          </label>
          <label className="form-wide">
            备注
            <textarea
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="一句话描述它适合什么场景"
              rows={3}
            />
          </label>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="form-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={closeForm}
          >
            取消
          </button>
          <button className="primary-button" type="submit">
            <Plus size={18} />
            保存菜品
          </button>
        </div>
      </form>
      {imagePickerOpen ? (
        <div
          className="image-picker-backdrop"
          data-closing={imagePickerClosing}
          role="presentation"
          onClick={closeImagePicker}
        >
          <section
            className="image-picker-dialog"
            data-closing={imagePickerClosing}
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-picker-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="form-header">
              <div>
                <p className="eyebrow">菜品图片</p>
                <h3 id="image-picker-title">选择图片</h3>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={closeImagePicker}
                title="关闭"
                aria-label="关闭图片选择"
              >
                <X size={20} />
              </button>
            </div>
            <div className="image-picker-grid">
              {imageChoices.map((option) => {
                const selected = form.imageUrl === option.imageUrl;
                return (
                  <button
                    className="image-choice image-choice-plain"
                    data-selected={selected}
                    type="button"
                    key={option.imageUrl}
                    onClick={() => selectImage(option.imageUrl)}
                    title={`选择 ${option.name} 的图片`}
                    aria-label={`选择 ${option.name} 的图片`}
                  >
                    <img src={option.imageUrl} alt="" />
                    {selected ? (
                      <strong>
                        <Check size={14} />
                      </strong>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
